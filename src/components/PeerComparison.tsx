import { useState, useEffect, useRef } from 'react';
import { fetchPeerBasics } from '../api/fmp';
import type { FMPPeerBasic } from '../api/fmp';
import type { StockAnalysis } from '../types';
import { fmtBn } from '../utils/calculations';

interface Props {
  data: StockAnalysis;
  onSelect: (ticker: string) => void;
}

interface BubbleItem {
  symbol: string;
  name: string;
  marketCap: number;
  price: number;
  isActive: boolean;
}

// Logarithmic radius: compresses the gap between small and mega caps
function logRadius(capBn: number, maxR: number, minR: number, minCap: number, maxCap: number): number {
  const safeMin = Math.max(minR, 12);
  const safeMax = Math.max(maxR, safeMin + 1); // guarantee maxR > minR
  const safeCap = Number.isFinite(capBn) && capBn > 0 ? capBn : 1;
  const safeMinCap = Number.isFinite(minCap) && minCap > 0 ? minCap : 1;
  const safeMaxCap = Number.isFinite(maxCap) && maxCap > safeMinCap ? maxCap : safeMinCap + 1;
  const logMin = Math.log10(safeMinCap + 1);
  const logMax = Math.log10(safeMaxCap + 1);
  const logVal = Math.log10(safeCap + 1);
  const t = Math.max(0, Math.min(1, (logVal - logMin) / (logMax - logMin)));
  return safeMin + t * (safeMax - safeMin);
}

function fmtPrice(p: number): string {
  if (!Number.isFinite(p)) return '—';
  return `$${p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── Bubble Chart ──────────────────────────────────────────────
function MarketCapBubbles({ items }: { items: BubbleItem[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(700);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      setWidth(entries[0].contentRect.width || 700);
    });
    ro.observe(el);
    setWidth(el.clientWidth || 700);
    return () => ro.disconnect();
  }, []);

  if (items.length === 0) return null;

  // Filter out items with invalid market caps before rendering
  const validItems = items.filter(i => Number.isFinite(i.marketCap) && i.marketCap > 0);
  if (validItems.length === 0) return null;

  const caps = validItems.map(i => i.marketCap / 1e9);
  const minCap = Math.min(...caps);
  const maxCap = Math.max(...caps);

  const MIN_R = 18;
  const MAX_R = Math.max(MIN_R + 8, Math.min(60, width / (validItems.length * 2.4)));
  const H = (MAX_R + 32) * 2 + 40;
  const cy = H / 2 - 10;

  // Space items evenly across width
  const padding = MAX_R + 14;
  const step = (width - padding * 2) / Math.max(validItems.length - 1, 1);

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <svg width={width} height={H} style={{ overflow: 'visible' }}>
        {validItems.map((item, i) => {
          const cx = validItems.length === 1 ? width / 2 : padding + i * step;
          const r = logRadius(item.marketCap / 1e9, MAX_R, MIN_R, minCap, maxCap);
          const color = item.isActive ? '#3b82f6' : '#64748b';
          const labelY = cy + r + 18;
          const capY = cy + r + 32;

          return (
            <g key={item.symbol} style={{ cursor: item.isActive ? 'default' : 'pointer' }}>
              {/* Glow ring for active */}
              {item.isActive && (
                <circle cx={cx} cy={cy} r={r + 7} fill="none" stroke="#3b82f6" strokeWidth={1.5} strokeOpacity={0.3} />
              )}
              {/* Main bubble */}
              <circle
                cx={cx} cy={cy} r={r}
                fill={color}
                fillOpacity={item.isActive ? 0.9 : 0.55}
                stroke={item.isActive ? '#93c5fd' : 'rgba(255,255,255,0.12)'}
                strokeWidth={item.isActive ? 2 : 1}
              />
              {/* Ticker inside bubble if large enough */}
              {r >= 26 ? (
                <text x={cx} y={cy + 4} textAnchor="middle"
                  fill={item.isActive ? '#fff' : '#e2e8f0'}
                  fontSize={Math.max(9, Math.min(13, r / 3.5))}
                  fontWeight={700} fontFamily="Inter, sans-serif">
                  {item.symbol}
                </text>
              ) : (
                <text x={cx} y={labelY} textAnchor="middle"
                  fill={item.isActive ? '#93c5fd' : '#94a3b8'}
                  fontSize={10} fontWeight={700} fontFamily="Inter, sans-serif">
                  {item.symbol}
                </text>
              )}
              {/* Market cap below bubble */}
              <text x={cx} y={r >= 26 ? labelY : capY} textAnchor="middle"
                fill="#6b7280" fontSize={9} fontFamily="Inter, sans-serif">
                {fmtBn(item.marketCap)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
export default function PeerComparison({ data, onSelect }: Props) {
  const [peers, setPeers] = useState<FMPPeerBasic[]>([]);
  const [loading, setLoading] = useState(false);
  const [noPeersFound, setNoPeersFound] = useState(false);
  const [peerError, setPeerError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setPeers([]); setNoPeersFound(false); setPeerError(''); setLoading(true);

    fetchPeerBasics(data.symbol)
      .then(result => {
        if (cancelled) return;
        if (result.length === 0) setNoPeersFound(true);
        else setPeers(result);
      })
      .catch(e => {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : '';
        if (msg !== 'PREMIUM_REQUIRED') setPeerError(msg || 'Could not load peer data');
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [data.symbol]);

  // Build the combined list: active stock + peers, sorted by market cap desc
  const activeItem: BubbleItem = {
    symbol: data.symbol,
    name: data.name,
    marketCap: data.marketCap,
    price: data.currentPrice ?? NaN,
    isActive: true,
  };

  const peerItems: BubbleItem[] = peers.map(p => ({
    symbol: p.symbol, name: p.name,
    marketCap: p.marketCap, price: p.price,
    isActive: false,
  }));

  const allItems = [activeItem, ...peerItems].sort((a, b) => b.marketCap - a.marketCap);

  return (
    <section className="peer-section">
      <div className="peer-section-header">
        <h2 className="section-title">Peer Comparison</h2>
        {loading && <span className="peer-loading-badge">Loading peers…</span>}
      </div>

      {peerError && <div className="peer-empty-state">⚠ {peerError}</div>}
      {!loading && !peerError && noPeersFound && (
        <div className="peer-empty-state">No peer data available for {data.symbol}.</div>
      )}

      {!noPeersFound && !peerError && (
        <>
          {/* Graph 1: Market Cap Bubbles */}
          <div className="peer-scatter-card">
            <div className="peer-scatter-meta">
              <span className="peer-scatter-label">Market Cap Comparison</span>
              <span className="peer-scatter-sub">Bubble size proportional to market cap (log scale)</span>
            </div>

            {loading && peers.length === 0 ? (
              <div className="peer-initial-loading">
                <div className="spinner" /><span>Loading peers…</span>
              </div>
            ) : (
              <div style={{ padding: '16px 8px 8px' }}>
                <MarketCapBubbles items={allItems} />
              </div>
            )}
          </div>

          {/* Peer cards */}
          <div className="peer-cards-grid">
            {/* Active stock */}
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
                  <span className="peer-card-metric-label">Price</span>
                  <span className="peer-card-metric-value">{fmtPrice(data.currentPrice ?? NaN)}</span>
                </div>
              </div>
            </div>

            {/* Peers */}
            {peers.map(p => (
              <div
                key={p.symbol}
                className="peer-card peer-card-clickable"
                onClick={() => onSelect(p.symbol)}
              >
                <div className="peer-card-top">
                  <span className="peer-card-ticker" style={{ color: '#64748b' }}>{p.symbol}</span>
                  <span className="peer-card-analyze">Analyze →</span>
                </div>
                <p className="peer-card-name">{p.name}</p>
                <div className="peer-card-metrics">
                  <div className="peer-card-metric">
                    <span className="peer-card-metric-label">Mkt Cap</span>
                    <span className="peer-card-metric-value">{fmtBn(p.marketCap)}</span>
                  </div>
                  <div className="peer-card-metric">
                    <span className="peer-card-metric-label">Price</span>
                    <span className="peer-card-metric-value">{fmtPrice(p.price)}</span>
                  </div>
                </div>
              </div>
            ))}

            {/* Skeleton while loading */}
            {loading && peers.length === 0 && Array.from({ length: 4 }).map((_, i) => (
              <div key={`skeleton-${i}`} className="peer-card peer-card-skeleton">
                <div className="peer-skeleton-line peer-skeleton-ticker" />
                <div className="peer-skeleton-line peer-skeleton-name" />
                <div className="peer-skeleton-metrics">
                  {Array.from({ length: 2 }).map((_, j) => <div key={j} className="peer-skeleton-metric" />)}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
