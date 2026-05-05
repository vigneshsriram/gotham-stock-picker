import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import type { StockAnalysis } from '../../types';
import MetricCard from '../MetricCard';
import { fmtPct, fmtNum, TOOLTIP_STYLE, TICK_STYLE } from '../../utils/calculations';

interface Props { data: StockAnalysis }

export default function EPSGrowth({ data }: Props) {
  const chartData = data.annualData.map(d => ({
    year: d.year,
    eps: Number.isFinite(d.eps) ? +d.eps.toFixed(2) : null,
  }));

  const last = data.annualData[data.annualData.length - 1];

  const footer = (
    <div className="metric-stats">
      <div className="metric-stat">
        <span className="metric-stat-label">10-yr EPS CAGR</span>
        <span className="metric-stat-value">{fmtPct(data.epsCAGR)}</span>
      </div>
      <div className="metric-stat">
        <span className="metric-stat-label">Latest EPS</span>
        <span className="metric-stat-value">${fmtNum(last?.eps ?? NaN, 2)}</span>
      </div>
      <div className="metric-stat">
        <span className="metric-stat-label">P/E Ratio</span>
        <span className="metric-stat-value">{Number.isFinite(data.peRatio) && data.peRatio > 0 ? fmtNum(data.peRatio) + 'x' : 'N/A'}</span>
      </div>
    </div>
  );

  return (
    <MetricCard number={6} title="EPS Growth" score={data.scores.epsGrowth} footer={footer}>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid stroke="#1a1a2e" vertical={false} />
          <XAxis dataKey="year" tick={TICK_STYLE} />
          <YAxis tick={TICK_STYLE} tickFormatter={v => `$${v}`} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(val: unknown) => [typeof val === 'number' ? `$${val.toFixed(2)}` : '', 'EPS']}
          />
          <Bar dataKey="eps" name="EPS" radius={[2, 2, 0, 0]}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={(entry.eps ?? 0) >= 0 ? '#3b82f6' : '#ef4444'} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </MetricCard>
  );
}
