import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import type { StockAnalysis } from '../../types';
import MetricCard from '../MetricCard';
import { fmtBn, fmtPct, TOOLTIP_STYLE, TICK_STYLE } from '../../utils/calculations';

interface Props { data: StockAnalysis }

export default function RevenueGrowth({ data }: Props) {
  const chartData = data.annualData.map(d => ({
    year: d.year,
    revenue: Number.isFinite(d.revenue) ? d.revenue / 1e9 : null,
    opIncome: Number.isFinite(d.operatingIncome) ? d.operatingIncome / 1e9 : null,
  }));

  const last = data.annualData[data.annualData.length - 1];
  const prev = data.annualData[data.annualData.length - 2];
  const yoyGrowth = last && prev && Number.isFinite(last.revenue) && Number.isFinite(prev.revenue) && prev.revenue !== 0
    ? (last.revenue - prev.revenue) / prev.revenue : NaN;

  const footer = (
    <div className="metric-stats">
      <div className="metric-stat">
        <span className="metric-stat-label">10-yr CAGR</span>
        <span className="metric-stat-value">{fmtPct(data.revenueCAGR)}</span>
      </div>
      <div className="metric-stat">
        <span className="metric-stat-label">Latest Revenue</span>
        <span className="metric-stat-value">{fmtBn(last?.revenue ?? NaN)}</span>
      </div>
      <div className="metric-stat">
        <span className="metric-stat-label">YoY Growth</span>
        <span className="metric-stat-value">{fmtPct(yoyGrowth)}</span>
      </div>
    </div>
  );

  return (
    <MetricCard number={1} title="Revenue Growth" score={data.scores.revenueGrowth} footer={footer}>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid stroke="#1a1a2e" vertical={false} />
          <XAxis dataKey="year" tick={TICK_STYLE} />
          <YAxis
            yAxisId="left"
            tick={TICK_STYLE}
            tickFormatter={v => `$${v.toFixed(0)}B`}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(val: unknown, name: unknown) => [typeof val === 'number' ? `$${val.toFixed(1)}B` : '', String(name)]}
          />
          <Legend wrapperStyle={{ color: '#6b7280', fontSize: 11 }} />
          <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="#3b82f6" fillOpacity={0.8} radius={[2, 2, 0, 0]} />
          <Line yAxisId="left" dataKey="opIncome" name="Op Income" stroke="#10b981" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </MetricCard>
  );
}
