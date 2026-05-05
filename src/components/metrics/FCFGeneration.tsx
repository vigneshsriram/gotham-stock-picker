import {
  Area, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ComposedChart, Legend,
} from 'recharts';
import type { StockAnalysis } from '../../types';
import MetricCard from '../MetricCard';
import { fmtBn, fmtPct, TOOLTIP_STYLE, TICK_STYLE } from '../../utils/calculations';

interface Props { data: StockAnalysis }

export default function FCFGeneration({ data }: Props) {
  const chartData = data.annualData.map(d => ({
    year: d.year,
    fcf: Number.isFinite(d.fcf) ? d.fcf / 1e9 : null,
    ocf: Number.isFinite(d.operatingCashFlow) ? d.operatingCashFlow / 1e9 : null,
  }));

  const last = data.annualData[data.annualData.length - 1];

  const footer = (
    <div className="metric-stats">
      <div className="metric-stat">
        <span className="metric-stat-label">Avg FCF Margin</span>
        <span className="metric-stat-value">{fmtPct(data.avgFCFMargin)}</span>
      </div>
      <div className="metric-stat">
        <span className="metric-stat-label">10-yr FCF CAGR</span>
        <span className="metric-stat-value">{fmtPct(data.fcfCAGR)}</span>
      </div>
      <div className="metric-stat">
        <span className="metric-stat-label">Latest FCF</span>
        <span className="metric-stat-value">{fmtBn(last?.fcf ?? NaN)}</span>
      </div>
    </div>
  );

  return (
    <MetricCard number={2} title="FCF Generation" score={data.scores.fcf} footer={footer}>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id="fcfGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#1a1a2e" vertical={false} />
          <XAxis dataKey="year" tick={TICK_STYLE} />
          <YAxis tick={TICK_STYLE} tickFormatter={v => `$${v?.toFixed(0)}B`} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(val: unknown, name: unknown) => [typeof val === 'number' ? `$${val.toFixed(1)}B` : '', String(name)]}
          />
          <Legend wrapperStyle={{ color: '#6b7280', fontSize: 11 }} />
          <Area dataKey="fcf" name="FCF" stroke="#10b981" fill="url(#fcfGrad)" strokeWidth={2} />
          <Line dataKey="ocf" name="Op Cash Flow" stroke="#3b82f6" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </MetricCard>
  );
}

