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

  const summary = "Measures how fast the company's top-line sales are growing. Consistent growth signals rising demand and an expanding business.";

  const explanation = (
    <div className="me-body">
      <p className="me-p"><strong>What it measures:</strong> The compound annual growth rate (CAGR) of revenue over 10 years, plus the most recent year-over-year change.</p>
      <p className="me-p"><strong>Why it matters:</strong> Revenue growth is the foundation of compounding. A company that consistently grows its sales at 10%+ per year doubles revenue roughly every 7 years, giving earnings and cash flow room to compound alongside it.</p>
      <p className="me-p"><strong>Scoring thresholds:</strong></p>
      <ul className="me-list">
        <li><strong>10/10</strong> — 10-yr CAGR ≥ 15% (e.g. Nvidia 2015–2024)</li>
        <li><strong>7/10</strong> — CAGR 10–15% (e.g. Microsoft, Apple)</li>
        <li><strong>4/10</strong> — CAGR 5–10% (steady but not exceptional)</li>
        <li><strong>1/10</strong> — CAGR below 5% or declining revenue</li>
      </ul>
      <p className="me-p"><strong>Watch out for:</strong> Revenue boosted by acquisitions (inorganic growth), one-time licensing deals, or foreign exchange tailwinds. Look for organic, recurring revenue growth.</p>
    </div>
  );

  return (
    <MetricCard number={1} title="Revenue Growth" score={data.scores.revenueGrowth} footer={footer} summary={summary} explanation={explanation}>
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
