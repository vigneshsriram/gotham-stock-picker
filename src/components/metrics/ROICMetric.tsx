import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { StockAnalysis } from '../../types';
import MetricCard from '../MetricCard';
import { fmtPct, TOOLTIP_STYLE, TICK_STYLE } from '../../utils/calculations';

interface Props { data: StockAnalysis }

export default function ROICMetric({ data }: Props) {
  const chartData = data.annualData.map(d => ({
    year: d.year,
    roic: Number.isFinite(d.roic) ? +(d.roic * 100).toFixed(2) : null,
  }));

  const last = data.annualData[data.annualData.length - 1];
  const above15 = data.annualData.filter(d => Number.isFinite(d.roic) && d.roic > 0.15).length;
  const above20 = data.annualData.filter(d => Number.isFinite(d.roic) && d.roic > 0.20).length;

  const footer = (
    <div className="metric-stats">
      <div className="metric-stat">
        <span className="metric-stat-label">Avg ROIC</span>
        <span className="metric-stat-value">{fmtPct(data.avgROIC)}</span>
      </div>
      <div className="metric-stat">
        <span className="metric-stat-label">Latest ROIC</span>
        <span className="metric-stat-value">{fmtPct(last?.roic ?? NaN)}</span>
      </div>
      <div className="metric-stat">
        <span className="metric-stat-label">Yrs &gt;15%</span>
        <span className="metric-stat-value">{above15}</span>
      </div>
      <div className="metric-stat">
        <span className="metric-stat-label">Yrs &gt;20%</span>
        <span className="metric-stat-value">{above20}</span>
      </div>
    </div>
  );

  const summary = "Return on Invested Capital measures how efficiently management turns every dollar of capital into profit. Above the cost of capital = value creation.";

  const explanation = (
    <div className="me-body">
      <p className="me-p"><strong>What it measures:</strong> ROIC = Net Operating Profit After Tax (NOPAT) ÷ Invested Capital (equity + net debt). It answers: for every dollar shareholders and lenders put in, how much profit does the business produce?</p>
      <p className="me-p"><strong>Why it matters:</strong> ROIC is arguably the single most important metric for long-term compounders. If ROIC consistently exceeds the cost of capital (~8–10%), the business is destroying value every time it grows. ROIC above 15% signals a true competitive moat.</p>
      <p className="me-p"><strong>Example:</strong> Visa has earned ROIC of 25–35% for over a decade — meaning the payment network business generates enormous profit relative to the capital tied up in it. Compare that to an airline that might earn 5% ROIC while its cost of capital is 8%.</p>
      <p className="me-p"><strong>Scoring thresholds:</strong></p>
      <ul className="me-list">
        <li><strong>10/10</strong> — ROIC ≥ 25% (elite compounder)</li>
        <li><strong>8/10</strong> — ROIC 15–25%</li>
        <li><strong>5/10</strong> — ROIC 10–15% (adequate)</li>
        <li><strong>2/10</strong> — ROIC below cost of capital</li>
      </ul>
      <p className="me-p"><strong>Watch out for:</strong> ROIC inflated by aggressive goodwill write-offs (reduces invested capital), share buybacks that shrink equity, or high leverage masking poor business economics.</p>
    </div>
  );

  return (
    <MetricCard number={4} title="ROIC" score={data.scores.roic} footer={footer} summary={summary} explanation={explanation}>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid stroke="#1a1a2e" vertical={false} />
          <XAxis dataKey="year" tick={TICK_STYLE} />
          <YAxis tick={TICK_STYLE} tickFormatter={v => `${v}%`} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(val: unknown) => [typeof val === 'number' ? `${val.toFixed(1)}%` : '', 'ROIC']}
          />
          <ReferenceLine y={15} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: '15%', fill: '#f59e0b', fontSize: 10 }} />
          <ReferenceLine y={20} stroke="#10b981" strokeDasharray="4 4" label={{ value: '20%', fill: '#10b981', fontSize: 10 }} />
          <Line dataKey="roic" name="ROIC" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </MetricCard>
  );
}
