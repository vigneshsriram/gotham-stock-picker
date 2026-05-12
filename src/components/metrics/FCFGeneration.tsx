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

  const summary = "Free cash flow is the real cash a business generates after reinvestment. It's what's left to reward shareholders — harder to fake than earnings.";

  const explanation = (
    <div className="me-body">
      <p className="me-p"><strong>What it measures:</strong> Free Cash Flow = Operating Cash Flow − Capital Expenditures. This card tracks FCF vs. operating cash flow over time and the FCF margin (FCF as % of revenue).</p>
      <p className="me-p"><strong>Why it matters:</strong> Earnings can be manipulated with accounting choices, but cash is harder to fake. A business that reliably converts revenue into free cash flow can fund dividends, buybacks, and acquisitions without needing external capital.</p>
      <p className="me-p"><strong>Example:</strong> Apple generates ~$100B in FCF on ~$400B revenue — a 25% FCF margin. That cash funded $600B+ in buybacks over the past decade, directly compounding shareholder value.</p>
      <p className="me-p"><strong>Scoring thresholds:</strong></p>
      <ul className="me-list">
        <li><strong>10/10</strong> — FCF margin ≥ 20% consistently</li>
        <li><strong>7/10</strong> — FCF margin 10–20%</li>
        <li><strong>4/10</strong> — FCF margin 5–10%</li>
        <li><strong>1/10</strong> — Negative or near-zero FCF</li>
      </ul>
      <p className="me-p"><strong>Watch out for:</strong> High earnings but low FCF — a sign of aggressive revenue recognition or high working capital needs. Also watch for FCF spikes from one-time asset sales.</p>
    </div>
  );

  return (
    <MetricCard number={2} title="FCF Generation" score={data.scores.fcf} footer={footer} summary={summary} explanation={explanation}>
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

