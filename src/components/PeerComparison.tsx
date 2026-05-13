import { useState, useEffect } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis,
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

const PEER_COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#06b6d4', '#ec4899', '#a3e635'];

interface ScatterPoint {
  symbol: string;
  name: string;
  x: number;   // operating margin (decimal)
  y: number;   // revenue growth YoY (decimal)
  z: number;   // market cap in billions
  pe: number | null;
  revenue: number;
  grossMargin: number;
  color: string;
  isActive: boolean;
}

// Custom dot — circle + ticker label underneath
function ScatterDot(props: ScatterShapeProps & { payload?: ScatterPoint }) {
  const cx = (props.cx as number) ?? 0;
  const cy = (props.cy as number) ?? 0;
  const payload = props.payload as ScatterPoint;
  // Scale radius from market cap: 8px (small cap) → 28px (mega cap)
  const r = payload ? Math.max(8, Math.min(28, 8 + Math.sqrt(payload.z) * 1.2)) : 12;
  const color = payload.color;
  return (
    <g>
      <circle
        cx={cx} cy={cy} r={r}
        fill={color}
        fillOpacity={payload.isActive ? 0.95 : 0.75}
        stroke={payload.isActive ? '#fff' : color}
        strokeWidth={payload.isActive ? 2.5 : 1}
      />
      {payload.isActive && (
        <circle cx={cx} cy={cy} r={r + 5} fill="none" stroke={color} strokeWidth={1} strokeOpacity={0.4} />
      )}
      <text
        x={cx} y={cy + r + 13}
        textAnchor="middle"
        fill={payload.isActive ? '#e2e8f0' : '#94a3b8'}
        fontSize={payload.isActive ? 11 : 10}
        fontWeight={payload.isActive ? 700 : 500}
        fontFamily="Inter, sans-serif"
      >
        {payload.symbol}
      </text>
    </g>
  );
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: ScatterPoint }[] }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="peer-tooltip">
      <p className="peer-tooltip-name">{d.name}</p>
      <p className="peer-tooltip-ticker">{d.symbol}</p>
      <div className="peer-tooltip-grid">
        <span>Op Margin</span><span>{Number.isFinite(d.x) ? fmtPct(d.x) : '—'}</span>
        <span>Rev Growth</span><span>{Number.isFinite(d.y) ? fmtPct(d.y) : '—'}</span>
        <span>Market Cap</span><span>{fmtBn(d.z * 1e9)}</span>
        <span>P/E</span><span>{d.pe ? `${d.pe.toFixed(1)}×` : '—'}</span>
        <span>Revenue</span><span>{fmtBn(d.revenue)}</span>
        <span>Gross Margin</span><span>{Number.isFinite(d.grossMargin) ? fmtPct(d.grossMargin) : '—'}</span>
      </div>
    </div>
  );
}

export default function PeerComparison({ data, onSelect }: Props) {
  const [peers, setPeers] = useState<FMPPeerSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [noPeersFound, setNoPeersFound] = useState(false);
  const [peerError, setPeerError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setPeers([]);
    setLoadedCount(0);
    setTotalCount(0);
    setNoPeersFound(false);
    setPeerError('');
    setLoading(true);

    async function load() {
      try {
        const tickers = await fetchPeers(data.symbol);
        const limited = tickers.slice(0, 5);
        if (cancelled) return;

        if (limited.length === 0) {
          setNoPeersFound(true);
          setLoading(false);
          return;
        }

        setTotalCount(limited.length);
        const results: FMPPeerSummary[] = [];
        for (const ticker of limited) {
          if (cancelled) return;
          try {
            const summary = await fetchPeerSummary(ticker);
            results.push(summary);
            if (!cancelled) {
              setPeers([...results]);
              setLoadedCount(results.length);
            }
          } catch {
            if (!cancelled) setLoadedCount(c => c + 1);
          }
        }
      } catch (e) {
        if (!cancelled) setPeerError(e instanceof Error ? e.message : 'Could not load peer data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [data.symbol]);

  // Build scatter data
  const lastIdx = data.annualData.length - 1;
  const latestYear = data.annualData[lastIdx];
  const prevYear = data.annualData[lastIdx - 1];
  const activeYoY = latestYear && prevYear && prevYear.revenue
    ? (latestYear.revenue - prevYear.revenue) / prevYear.revenue
    : 0;
  const activeOpMargin = latestYear?.operatingMargin ?? data.avgOperatingMargin;

  const activePoint: ScatterPoint = {
    symbol: data.symbol,
    name: data.name,
    x: activeOpMargin,
    y: activeYoY,
    z: data.marketCap / 1e9,
    pe: data.peRatio,
    revenue: latestYear?.revenue ?? NaN,
    grossMargin: latestYear?.grossMargin ?? NaN,
    color: '#3b82f6',
    isActive: true,
  };

  const peerPoints: ScatterPoint[] = peers
    .filter(p => Number.isFinite(p.operatingMargin) && Number.isFinite(p.revenueGrowthYoY))
    .map((p, i) => ({
      symbol: p.symbol,
      name: p.name,
      x: p.operatingMargin,
      y: p.revenueGrowthYoY,
      z: p.marketCap / 1e9,
      pe: p.pe,
      revenue: p.revenue,
      grossMargin: p.grossMargin,
      color: PEER_COLORS[i % PEER_COLORS.length],
      isActive: false,
    }));

  const allPoints = [activePoint, ...peerPoints];
  const allX = allPoints.map(p => p.x).filter(Number.isFinite);
  const allY = allPoints.map(p => p.y).filter(Number.isFinite);
  const xMid = allX.length ? (Math.max(...allX) + Math.min(...allX)) / 2 : 0.15;
  const yMid = allY.length ? (Math.max(...allY) + Math.min(...allY)) / 2 : 0.10;

  return (
    <section className="peer-section">
      <div className="peer-section-header">
        <h2 className="section-title">Peer Comparison</h2>
        {loading && totalCount > 0 && (
          <span className="peer-loading-badge">
            Loading {loadedCount}/{totalCount} peers…
          </span>
        )}
        {loading && totalCount === 0 && (
          <span className="peer-loading-badge">Finding peers…</span>
        )}
      </div>

      {peerError && (
        <div className="peer-empty-state">⚠ {peerError}</div>
      )}
      {!loading && !peerError && noPeersFound && (
        <div className="peer-empty-state">No peer data available for {data.symbol}.</div>
      )}

      {peerPoints.length > 0 && (
        <>
          {/* Scatter plot */}
          <div className="peer-scatter-card">
            <div className="peer-scatter-meta">
              <span className="peer-scatter-label">Operating Margin vs Revenue Growth</span>
              <span className="peer-scatter-sub">Bubble size = market cap</span>
            </div>
            <div className="peer-quadrant-wrap">
              {/* Quadrant labels */}
              <div className="peer-quad peer-quad-tl">Growth Stage</div>
              <div className="peer-quad peer-quad-tr">Quality Compounders</div>
              <div className="peer-quad peer-quad-bl">Value Traps</div>
              <div className="peer-quad peer-quad-br">Cash Cows</div>

              <ResponsiveContainer width="100%" height={380}>
                <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                  <CartesianGrid stroke="#1a1a2e" strokeDasharray="4 4" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="Op Margin"
                    tickFormatter={v => `${(v * 100).toFixed(0)}%`}
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                    label={{ value: 'Operating Margin', position: 'insideBottom', offset: -10, fill: '#6b7280', fontSize: 11 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="Rev Growth"
                    tickFormatter={v => `${(v * 100).toFixed(0)}%`}
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                    label={{ value: 'Revenue Growth (YoY)', angle: -90, position: 'insideLeft', offset: 10, fill: '#6b7280', fontSize: 11 }}
                  />
                  <ZAxis type="number" dataKey="z" range={[300, 2500]} />
                  <ReferenceLine x={xMid} stroke="#2a2a4a" strokeDasharray="6 3" />
                  <ReferenceLine y={yMid} stroke="#2a2a4a" strokeDasharray="6 3" />
                  <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#2a2a4a' }} />
                  {/* Peers first so active renders on top */}
                  <Scatter
                    data={peerPoints}
                    shape={(props: ScatterShapeProps) => <ScatterDot {...props} />}
                  />
                  <Scatter
                    data={[activePoint]}
                    shape={(props: ScatterShapeProps) => <ScatterDot {...props} />}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Peer cards */}
          <div className="peer-cards-grid">
            {/* Active stock card */}
            <div className="peer-card peer-card-active">
              <div className="peer-card-top">
                <span className="peer-card-ticker" style={{ color: '#3b82f6' }}>{data.symbol}</span>
                <span className="peer-card-tag">You</span>
              </div>
              <p className="peer-card-name">{data.name}</p>
              <div className="peer-card-metrics">
                <div className="peer-card-metric">
                  <span className="peer-card-metric-label">Mkt Cap</span>
                  <span className="peer-card-metric-value">{fmtBn(data.marketCap)}</span>
                </div>
                <div className="peer-card-metric">
                  <span className="peer-card-metric-label">P/E</span>
                  <span className="peer-card-metric-value">{data.peRatio ? `${data.peRatio.toFixed(1)}×` : '—'}</span>
                </div>
                <div className="peer-card-metric">
                  <span className="peer-card-metric-label">Op Margin</span>
                  <span className="peer-card-metric-value">{fmtPct(activeOpMargin)}</span>
                </div>
                <div className="peer-card-metric">
                  <span className="peer-card-metric-label">Rev Growth</span>
                  <span className="peer-card-metric-value">{fmtPct(activeYoY)}</span>
                </div>
                <div className="peer-card-metric">
                  <span className="peer-card-metric-label">Revenue</span>
                  <span className="peer-card-metric-value">{fmtBn(latestYear?.revenue ?? NaN)}</span>
                </div>
                <div className="peer-card-metric">
                  <span className="peer-card-metric-label">Gross Margin</span>
                  <span className="peer-card-metric-value">{fmtPct(latestYear?.grossMargin ?? NaN)}</span>
                </div>
              </div>
            </div>

            {/* Peer cards */}
            {peers.map((p, i) => {
              const color = PEER_COLORS[i % PEER_COLORS.length];
              return (
                <div
                  key={p.symbol}
                  className="peer-card peer-card-clickable"
                  onClick={() => onSelect(p.symbol)}
                  style={{ '--peer-color': color } as React.CSSProperties}
                >
                  <div className="peer-card-top">
                    <span className="peer-card-ticker" style={{ color }}>{p.symbol}</span>
                    <span className="peer-card-analyze">Analyze →</span>
                  </div>
                  <p className="peer-card-name">{p.name}</p>
                  <div className="peer-card-metrics">
                    <div className="peer-card-metric">
                      <span className="peer-card-metric-label">Mkt Cap</span>
                      <span className="peer-card-metric-value">{fmtBn(p.marketCap)}</span>
                    </div>
                    <div className="peer-card-metric">
                      <span className="peer-card-metric-label">P/E</span>
                      <span className="peer-card-metric-value">{p.pe ? `${p.pe.toFixed(1)}×` : '—'}</span>
                    </div>
                    <div className="peer-card-metric">
                      <span className="peer-card-metric-label">Op Margin</span>
                      <span className="peer-card-metric-value">{Number.isFinite(p.operatingMargin) ? fmtPct(p.operatingMargin) : '—'}</span>
                    </div>
                    <div className="peer-card-metric">
                      <span className="peer-card-metric-label">Rev Growth</span>
                      <span className="peer-card-metric-value">{Number.isFinite(p.revenueGrowthYoY) ? fmtPct(p.revenueGrowthYoY) : '—'}</span>
                    </div>
                    <div className="peer-card-metric">
                      <span className="peer-card-metric-label">Revenue</span>
                      <span className="peer-card-metric-value">{fmtBn(p.revenue)}</span>
                    </div>
                    <div className="peer-card-metric">
                      <span className="peer-card-metric-label">Gross Margin</span>
                      <span className="peer-card-metric-value">{Number.isFinite(p.grossMargin) ? fmtPct(p.grossMargin) : '—'}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Loading skeleton cards */}
            {loading && Array.from({ length: Math.max(0, totalCount - peers.length) }).map((_, i) => (
              <div key={`skeleton-${i}`} className="peer-card peer-card-skeleton">
                <div className="peer-skeleton-line peer-skeleton-ticker" />
                <div className="peer-skeleton-line peer-skeleton-name" />
                <div className="peer-skeleton-metrics">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <div key={j} className="peer-skeleton-metric" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Initial loading state before any peers arrive */}
      {loading && peerPoints.length === 0 && (
        <div className="peer-initial-loading">
          <div className="spinner" />
          <span>Loading peer data…</span>
        </div>
      )}
    </section>
  );
}
