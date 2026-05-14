import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import type { StockAnalysis } from '../../types';
import { fmtBn, TOOLTIP_STYLE, TICK_STYLE } from '../../utils/calculations';

interface Props { data: StockAnalysis }

// Stable color palette — up to 10 segments
const SEGMENT_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6',
  '#ef4444', '#06b6d4', '#f97316', '#84cc16',
  '#ec4899', '#94a3b8',
];

// Normalise segment names that changed over time to a canonical form
// e.g. "iTunes, Software And Service" → "Service"
function normaliseKey(key: string): string {
  const k = key.trim();
  if (/itunes|software.*service/i.test(k)) return 'Service';
  if (/wearable|home.*accessor/i.test(k)) return 'Wearables & Home';
  if (/iphone/i.test(k)) return 'iPhone';
  if (/ipad/i.test(k)) return 'iPad';
  if (/ipod/i.test(k)) return 'iPod';
  if (/^mac$/i.test(k) || /total mac/i.test(k)) return 'Mac';
  if (/desktop/i.test(k)) return 'Mac Desktops';
  if (/portable/i.test(k)) return 'Mac Portables';
  if (/peripheral/i.test(k)) return 'Peripherals';
  if (/retail/i.test(k)) return 'Retail';
  if (/service/i.test(k)) return 'Service';
  return k;
}

export default function RevenueSegments({ data }: Props) {
  const { revenueSegments } = data;

  if (!revenueSegments || revenueSegments.length === 0) return null;

  // Collect all unique normalised segment names across all years
  const allSegments = Array.from(
    new Set(
      revenueSegments.flatMap(yr =>
        Object.keys(yr.segments).map(normaliseKey)
      )
    )
  );

  // Assign stable colors by segment name (sorted so order is deterministic)
  const sortedSegments = [...allSegments].sort();
  const colorMap: Record<string, string> = {};
  sortedSegments.forEach((seg, i) => {
    colorMap[seg] = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
  });

  // Build chart rows — one per year, keys are normalised segment names
  const chartData = revenueSegments.map(yr => {
    const row: Record<string, number | string> = { year: yr.year };
    // Aggregate by normalised key (handles rename across years)
    for (const [raw, val] of Object.entries(yr.segments)) {
      const key = normaliseKey(raw);
      row[key] = ((row[key] as number) || 0) + (val ?? 0);
    }
    // Convert to billions
    for (const seg of allSegments) {
      if (row[seg] !== undefined) row[seg] = (row[seg] as number) / 1e9;
    }
    return row;
  });

  // Latest year mix for the insight line
  const latest = revenueSegments[revenueSegments.length - 1];
  const latestNorm: Record<string, number> = {};
  for (const [raw, val] of Object.entries(latest.segments)) {
    const key = normaliseKey(raw);
    latestNorm[key] = (latestNorm[key] || 0) + (val ?? 0);
  }
  const latestTotal = Object.values(latestNorm).reduce((s, v) => s + v, 0);
  const topSegment = Object.entries(latestNorm).sort((a, b) => b[1] - a[1])[0];
  const topPct = latestTotal > 0 && topSegment ? ((topSegment[1] / latestTotal) * 100).toFixed(0) : null;

  // Which segments actually appear in recent years (last 3) — highlight in legend
  const recentSegments = new Set(
    revenueSegments.slice(-3).flatMap(yr => Object.keys(yr.segments).map(normaliseKey))
  );
  const activeSegments = sortedSegments.filter(s => recentSegments.has(s));

  return (
    <div className="metric-card">
      <div className="metric-card-header">
        <div className="metric-card-title-group">
          <span className="metric-title">Revenue by Segment</span>
        </div>
        {topPct && (
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            {topSegment[0]} {topPct}% of {latest.year} revenue
          </span>
        )}
      </div>
      <div className="metric-card-body">
      <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--muted)' }}>
        Stacked by product/business line · $B
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" vertical={false} />
          <XAxis dataKey="year" tick={TICK_STYLE} axisLine={false} tickLine={false} />
          <YAxis
            tick={TICK_STYLE}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => `$${v.toFixed(0)}B`}
            width={48}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(val, name) => [`$${fmtBn((val as number) * 1e9)}`, name as string]}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: 'var(--muted)', paddingTop: 8 }}
            formatter={(value) => (
              <span style={{ color: recentSegments.has(value) ? 'var(--text)' : 'var(--muted)' }}>
                {value}
              </span>
            )}
          />
          {activeSegments.map(seg => (
            <Bar key={seg} dataKey={seg} stackId="a" fill={colorMap[seg]} radius={seg === activeSegments[activeSegments.length - 1] ? [3, 3, 0, 0] : [0, 0, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>

      {/* % mix table for latest year */}
      <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: '8px 16px' }}>
        {Object.entries(latestNorm)
          .sort((a, b) => b[1] - a[1])
          .map(([seg, val]) => (
            <div key={seg} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: colorMap[seg], flexShrink: 0, display: 'inline-block' }} />
              <span style={{ color: 'var(--muted)' }}>{seg}</span>
              <span style={{ color: 'var(--text)', fontWeight: 600 }}>
                {latestTotal > 0 ? `${((val / latestTotal) * 100).toFixed(0)}%` : '—'}
              </span>
            </div>
          ))}
      </div>
      </div>
    </div>
  );
}
