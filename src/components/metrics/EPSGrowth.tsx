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

  const summary = "Earnings Per Share growth tracks how much profit the company generates per share. Consistent double-digit EPS growth is the engine behind long-term stock price appreciation.";

  const explanation = (
    <div className="me-body">
      <p className="me-p"><strong>What it measures:</strong> Earnings Per Share (EPS) = Net Income ÷ Diluted Shares Outstanding. This card shows annual EPS over time, highlighting negative years in red.</p>
      <p className="me-p"><strong>Why it matters:</strong> Over long periods, stock prices follow EPS growth. A stock trading at 20× earnings that grows EPS at 15% per year will roughly double in price every 5 years even if the valuation multiple stays flat. Consistent EPS growth is the engine of compounding.</p>
      <p className="me-p"><strong>Example:</strong> Monster Beverage grew EPS from ~$0.10 in 2005 to over $1.50 in 2023 — a 15× increase. Its stock price followed, turning early investors into millionaires. The EPS line told the story years before it was obvious.</p>
      <p className="me-p"><strong>Scoring thresholds:</strong></p>
      <ul className="me-list">
        <li><strong>10/10</strong> — EPS CAGR ≥ 15% with few negative years</li>
        <li><strong>7/10</strong> — EPS CAGR 10–15%</li>
        <li><strong>4/10</strong> — EPS CAGR 5–10% or occasional losses</li>
        <li><strong>1/10</strong> — Declining EPS or persistent losses</li>
      </ul>
      <p className="me-p"><strong>Watch out for:</strong> EPS growth driven purely by share buybacks (shrinking the denominator) rather than net income growth. Also watch for one-time items that inflate or deflate reported EPS — focus on normalized earnings.</p>
    </div>
  );

  return (
    <MetricCard number={6} title="EPS Growth" score={data.scores.epsGrowth} footer={footer} summary={summary} explanation={explanation}>
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
