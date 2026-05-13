import { useState, useEffect } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { ScatterShapeProps } from 'recharts';
import { fetchPeers, fetchPeerSummary } from '../api/fmp';
import type { FMPPeerSummary } from '../api/fmp';
import type { StockAnalysis } from '../types';
import { fmtBn, fmtPct } from '../utils/calculations';

interface Props {
  data: StockAnalysis;
  onSelect: (ticker: string) => void;
}

interface ScatterPoint {
  symbol: string;
  name: string;
  x: number;        // operating margin (decimal)
  y: number;        // revenue growth YoY (decimal)
  z: number;        // market cap in billions (for bubble size)
  pe: number | null;
  revenue: number;
  grossMargin: number;
  color: string;
  isActive: boolean;
  isOutlier: boolean;
}

// ── Helpers ──────────────────────────────────────────────────

// Logarithmic bubble radius: compresses the gap between $350M and $3T
function logRadius(capBn: number): number {
  const safe = Number.isFinite(capBn) && capBn > 0 ? capBn : 10;
  return Math.max(10, Math.min(32, 6 + Math.log10(safe + 1) * 9));
}

// Quadrant-based color: tells a story at a glance
function quadrantColor(x: number, y: number, xMid: number, yMid: number): string {
  const highMargin = x >= xMid;
  const highGrowth  = y >= yMid;
  if (highMargin && highGrowth)  return '#10b981'; // top-right  → quality compounder (green)
  if (!highMargin && highGrowth) return '#f59e0b'; // top-left   → growth stage (amber)
  if (highMargin && !highGrowth) return '#8b5cf6'; // bottom-right → cash cow (purple)
  return '#6b7280';                                // bottom-left  → laggard (gray)
}

// Outlier: more than 1.5× std-dev away from the group centroid
function detectOutliers(points: ScatterPoint[]): Set<string> {
  if (points.length < 3) return new Set();
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const meanX = xs.reduce((a, b) => a + b, 0) / xs.length;
  const meanY = ys.reduce((a, b) => a + b, 0) / ys.length;
  const stdX = Math.sqrt(xs.map(x => (x - meanX) ** 2).reduce((a, b) => a + b, 0) / xs.length);
  const stdY = Math.sqrt(ys.map(y => (y - meanY) ** 2).reduce((a, b) => a + b, 0) / ys.length);
  return new Set(
    points
      .filter(p => Math.abs(p.x - meanX) > 1.5 * stdX || Math.abs(p.y - meanY) > 1.5 * stdY)
      .map(p => p.symbol)
  );
}

// ── Custom dot: ticker label + outlier ring ───────────────────
function ScatterDot(props: ScatterShapeProps & { payload?: ScatterPoint }) {
  const cx = props.cx as number;
  const cy = props.cy as number;
  if (!Number.isFinite(cx) || !Number.isFinite(cy)) return <g />;
  const p = props.payload;
  if (!p) return <g />;

  const r = logRadius(p.z);
  const color = p.isActive ? '#3b82f6' : p.color;

  return (
    <g style={{ cursor: p.isActive ? 'default' : 'pointer' }}>
      {/* Outlier pulse ring */}
      {p.isOutlier && !p.isActive && (
        <circle cx={cx} cy={cy} r={r + 6} fill="none" stroke={color} strokeWidth={1.5} strokeOpacity={0.5} strokeDasharray="3 2" />
      )}
      {/* Active stock glow */}
      {p.isActive && (
        <circle cx={cx} cy={cy} r={r + 6} fill="none" stroke={color} strokeWidth={1.5} strokeOpacity={0.35} />
      )}
      {/* Main dot */}
      <circle
        cx={cx} cy={cy} r={r}
        fill={color}
        fillOpacity={p.isActive ? 1 : 0.8}
        stroke={p.isActive ? '#fff' : 'rgba(255,255,255,0.15)'}
        strokeWidth={p.isActive ? 2 : 1}
      />
      {/* Ticker label */}
      <text
        x={cx}
        y={cy + r + 14}
        textAnchor="middle"
        fill={p.isActive ? '#e2e8f0' : '#cbd5e1'}
        fontSize={p.isActive ? 11 : 10}
        fontWeight={p.isActive ? 800 : 600}
        fontFamily="Inter, sans-serif"
        letterSpacing="0.03em"
      >
        {p.symbol}
      </text>
    </g>
  );
}

// ── Tooltip ───────────────────────────────────────────────────
function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: ScatterPoint }[] }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  const color = d.isActive ? '#3b82f6' : d.color;
  return (
    <div className="peer-tooltip">
      <div className="peer-tooltip-header">
        <span className="peer-tooltip-ticker" style={{ color }}>{d.symbol}</span>
        {d.isOutlier && !d.isActive && <span className="peer-tooltip-outlier-badge">Outlier</span>}
      </div>
      <p className="peer-tooltip-name">{d.name}</p>
      <div className="peer-tooltip-grid">
        <span>Op Margin</span>   <span>{Number.isFinite(d.x) ? fmtPct(d.x) : '—'}</span>
        <span>Rev Growth</span>  <span>{Number.isFinite(d.y) ? fmtPct(d.y) : '—'}</span>
        <span>Market Cap</span>  <span>{fmtBn(d.z * 1e9)}</span>
        <span>P/E</span>         <span>{d.pe ? `${d.pe.toFixed(1)}×` : '—'}</span>
        <span>Revenue</span>     <span>{fmtBn(d.revenue)}</span>
        <span>Gross Margin</span><span>{Number.isFinite(d.grossMargin) ? fmtPct(d.grossMargin) : '—'}</span>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
export default function PeerComparison({ data, onSelect }: Props) {
  const [peers, setPeers] = useState<FMPPeerSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [noPeersFound, setNoPeersFound] = useState(false);
  const [peerError, setPeerError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setPeers([]); setLoadedCount(0); setTotalCount(0);
    setNoPeersFound(false); setPeerError(''); setLoading(true);

    async function load() {
      try {
        const tickers = await fetchPeers(data.symbol);
        const limited = tickers.slice(0, 6);
        if (cancelled) return;
        if (limited.length === 0) { setNoPeersFound(true); setLoading(false); return; }
        setTotalCount(limited.length);
        const results: FMPPeerSummary[] = [];
        for (const ticker of limited) {
          if (cancelled) return;
          try {
            const summary = await fetchPeerSummary(ticker);
            results.push(summary);
            if (!cancelled) { setPeers([...results]); setLoadedCount(results.length); }
          } catch { if (!cancelled) setLoadedCount(c => c + 1); }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : '';
        if (!cancelled && msg !== 'PREMIUM_REQUIRED') setPeerError(msg || 'Could not load peer data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [data.symbol]);

  // ── Build scatter points ──────────────────────────────────
  const lastIdx = data.annualData.length - 1;
  const latestYear  = data.annualData[lastIdx];
  const prevYear    = data.annualData[lastIdx - 1];
  const activeYoY   = latestYear && prevYear?.revenue
    ? (latestYear.revenue - prevYear.revenue) / prevYear.revenue : 0;
  const activeOpMargin = latestYear?.operatingMargin ?? data.avgOperatingMargin;

  // Compute midpoints from all valid data first (needed for colors)
  const rawPeerPoints = peers.filter(p =>
    Number.isFinite(p.operatingMargin) && Number.isFinite(p.revenueGrowthYoY) && Number.isFinite(p.marketCap)
  );

  const allX = [activeOpMargin, ...rawPeerPoints.map(p => p.operatingMargin)].filter(Number.isFinite);
  const allY = [activeYoY, ...rawPeerPoints.map(p => p.revenueGrowthYoY)].filter(Number.isFinite);
  const xMid = allX.length ? (Math.max(...allX) + Math.min(...allX)) / 2 : 0.15;
  const yMid = allY.length ? (Math.max(...allY) + Math.min(...allY)) / 2 : 0.10;

  const activePoint: ScatterPoint = {
    symbol: data.symbol, name: data.name,
    x: activeOpMargin, y: activeYoY,
    z: Number.isFinite(data.marketCap) && data.marketCap > 0 ? data.marketCap / 1e9 : 100,
    pe: data.peRatio,
    revenue: latestYear?.revenue ?? NaN,
    grossMargin: latestYear?.grossMargin ?? NaN,
    color: '#3b82f6', isActive: true, isOutlier: false,
  };

  const peerPoints: ScatterPoint[] = rawPeerPoints.map(p => ({
    symbol: p.symbol, name: p.name,
    x: p.operatingMargin, y: p.revenueGrowthYoY,
    z: p.marketCap / 1e9,
    pe: p.pe, revenue: p.revenue, grossMargin: p.grossMargin,
    color: quadrantColor(p.operatingMargin, p.revenueGrowthYoY, xMid, yMid),
    isActive: false, isOutlier: false,
  }));

  // Mark outliers after building points
  const outlierSet = detectOutliers([activePoint, ...peerPoints]);
  peerPoints.forEach(p => { p.isOutlier = outlierSet.has(p.symbol); });

  return (
    <section className="peer-section">
      <div className="peer-section-header">
        <h2 className="section-title">Peer Comparison</h2>
        {loading && totalCount > 0 && <span className="peer-loading-badge">Loading {loadedCount}/{totalCount} peers…</span>}
        {loading && totalCount === 0 && <span className="peer-loading-badge">Finding peers…</span>}
      </div>

      {peerError && <div className="peer-empty-state">⚠ {peerError}</div>}
      {!loading && !peerError && noPeersFound && <div className="peer-empty-state">No peer data available for {data.symbol}.</div>}

      {!noPeersFound && !peerError && (
        <>
          {/* Scatter */}
          <div className="peer-scatter-card">
            <div className="peer-scatter-meta">
              <span className="peer-scatter-label">Operating Margin vs Revenue Growth</span>
              <span className="peer-scatter-sub">Bubble size = market cap (log scale)</span>
            </div>

            {/* Quadrant legend */}
            <div className="peer-quad-legend">
              <span className="peer-quad-legend-item" style={{ color: '#10b981' }}>● Quality Compounders</span>
              <span className="peer-quad-legend-item" style={{ color: '#f59e0b' }}>● Growth Stage</span>
              <span className="peer-quad-legend-item" style={{ color: '#8b5cf6' }}>● Cash Cows</span>
              <span className="peer-quad-legend-item" style={{ color: '#6b7280' }}>● Laggards</span>
            </div>

            <div className="peer-quadrant-wrap">
              <div className="peer-quad peer-quad-tl">Growth Stage</div>
              <div className="peer-quad peer-quad-tr">Quality Compounders</div>
              <div className="peer-quad peer-quad-bl">Laggards</div>
              <div className="peer-quad peer-quad-br">Cash Cows</div>

              <ResponsiveContainer width="100%" height={400}>
                <ScatterChart margin={{ top: 24, right: 40, bottom: 32, left: 24 }}>
                  <CartesianGrid stroke="#1a1a2e" strokeDasharray="4 4" />
                  <XAxis
                    type="number" dataKey="x" name="Op Margin"
                    tickFormatter={v => `${(v * 100).toFixed(0)}%`}
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                    label={{ value: 'Operating Margin →', position: 'insideBottom', offset: -16, fill: '#6b7280', fontSize: 11 }}
                  />
                  <YAxis
                    type="number" dataKey="y" name="Rev Growth"
                    tickFormatter={v => `${(v * 100).toFixed(0)}%`}
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                    label={{ value: '↑ Revenue Growth (YoY)', angle: -90, position: 'insideLeft', offset: 16, fill: '#6b7280', fontSize: 11 }}
                  />
                  <ReferenceLine x={xMid} stroke="#2a2a4a" strokeDasharray="6 3" />
                  <ReferenceLine y={yMid} stroke="#2a2a4a" strokeDasharray="6 3" />
                  <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#2a2a4a' }} />
                  {/* Peers first so active renders on top */}
                  {peerPoints.length > 0 && (
                    <Scatter data={peerPoints} shape={(props: ScatterShapeProps) => <ScatterDot {...props} />} />
                  )}
                  <Scatter data={[activePoint]} shape={(props: ScatterShapeProps) => <ScatterDot {...props} />} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            {loading && peerPoints.length === 0 && (
              <div className="peer-initial-loading">
                <div className="spinner" /><span>Loading peers…</span>
              </div>
            )}
          </div>

          {/* Cards */}
          <div className="peer-cards-grid">
            {/* Active stock */}
            <div className="peer-card peer-card-active">
              <div className="peer-card-top">
                <span className="peer-card-ticker" style={{ color: '#3b82f6' }}>{data.symbol}</span>
                <span className="peer-card-tag">You</span>
              </div>
              <p className="peer-card-name">{data.name}</p>
              <div className="peer-card-metrics">
                <div className="peer-card-metric"><span className="peer-card-metric-label">Mkt Cap</span><span className="peer-card-metric-value">{fmtBn(data.marketCap)}</span></div>
                <div className="peer-card-metric"><span className="peer-card-metric-label">P/E</span><span className="peer-card-metric-value">{data.peRatio ? `${data.peRatio.toFixed(1)}×` : '—'}</span></div>
                <div className="peer-card-metric"><span className="peer-card-metric-label">Op Margin</span><span className="peer-card-metric-value">{fmtPct(activeOpMargin)}</span></div>
                <div className="peer-card-metric"><span className="peer-card-metric-label">Rev Growth</span><span className="peer-card-metric-value">{fmtPct(activeYoY)}</span></div>
                <div className="peer-card-metric"><span className="peer-card-metric-label">Revenue</span><span className="peer-card-metric-value">{fmtBn(latestYear?.revenue ?? NaN)}</span></div>
                <div className="peer-card-metric"><span className="peer-card-metric-label">Gross Margin</span><span className="peer-card-metric-value">{fmtPct(latestYear?.grossMargin ?? NaN)}</span></div>
              </div>
            </div>

            {/* Peers */}
            {peers.map(p => {
              const color = quadrantColor(p.operatingMargin, p.revenueGrowthYoY, xMid, yMid);
              const isOutlier = outlierSet.has(p.symbol);
              return (
                <div
                  key={p.symbol}
                  className="peer-card peer-card-clickable"
                  onClick={() => onSelect(p.symbol)}
                  style={{ '--peer-color': color } as React.CSSProperties}
                >
                  <div className="peer-card-top">
                    <span className="peer-card-ticker" style={{ color }}>{p.symbol}</span>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {isOutlier && <span className="peer-card-outlier-badge">Outlier</span>}
                      <span className="peer-card-analyze">Analyze →</span>
                    </div>
                  </div>
                  <p className="peer-card-name">{p.name}</p>
                  <div className="peer-card-metrics">
                    <div className="peer-card-metric"><span className="peer-card-metric-label">Mkt Cap</span><span className="peer-card-metric-value">{fmtBn(p.marketCap)}</span></div>
                    <div className="peer-card-metric"><span className="peer-card-metric-label">P/E</span><span className="peer-card-metric-value">{p.pe ? `${p.pe.toFixed(1)}×` : '—'}</span></div>
                    <div className="peer-card-metric"><span className="peer-card-metric-label">Op Margin</span><span className="peer-card-metric-value">{Number.isFinite(p.operatingMargin) ? fmtPct(p.operatingMargin) : '—'}</span></div>
                    <div className="peer-card-metric"><span className="peer-card-metric-label">Rev Growth</span><span className="peer-card-metric-value">{Number.isFinite(p.revenueGrowthYoY) ? fmtPct(p.revenueGrowthYoY) : '—'}</span></div>
                    <div className="peer-card-metric"><span className="peer-card-metric-label">Revenue</span><span className="peer-card-metric-value">{fmtBn(p.revenue)}</span></div>
                    <div className="peer-card-metric"><span className="peer-card-metric-label">Gross Margin</span><span className="peer-card-metric-value">{Number.isFinite(p.grossMargin) ? fmtPct(p.grossMargin) : '—'}</span></div>
                  </div>
                </div>
              );
            })}

            {/* Skeleton placeholders */}
            {loading && Array.from({ length: Math.max(0, totalCount - peers.length) }).map((_, i) => (
              <div key={`skeleton-${i}`} className="peer-card peer-card-skeleton">
                <div className="peer-skeleton-line peer-skeleton-ticker" />
                <div className="peer-skeleton-line peer-skeleton-name" />
                <div className="peer-skeleton-metrics">
                  {Array.from({ length: 6 }).map((_, j) => <div key={j} className="peer-skeleton-metric" />)}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
