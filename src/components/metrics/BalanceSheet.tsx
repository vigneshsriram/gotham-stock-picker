import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { StockAnalysis } from '../../types';
import MetricCard from '../MetricCard';
import { fmtBn, fmtNum, TOOLTIP_STYLE, TICK_STYLE } from '../../utils/calculations';

interface Props { data: StockAnalysis }

export default function BalanceSheet({ data }: Props) {
  const chartData = data.annualData.map(d => ({
    year: d.year,
    equity: Number.isFinite(d.totalEquity) ? d.totalEquity / 1e9 : null,
    netDebt: Number.isFinite(d.netDebt) ? d.netDebt / 1e9 : null,
    debtToEbitda: Number.isFinite(d.debtToEbitda) ? +d.debtToEbitda.toFixed(2) : null,
  }));

  const last = data.annualData[data.annualData.length - 1];
  const netDebtStr = last && Number.isFinite(last.netDebt)
    ? last.netDebt < 0 ? `Net Cash ${fmtBn(Math.abs(last.netDebt))}` : fmtBn(last.netDebt)
    : 'N/A';

  const footer = (
    <div className="metric-stats">
      <div className="metric-stat">
        <span className="metric-stat-label">D/EBITDA</span>
        <span className="metric-stat-value">{last && Number.isFinite(last.debtToEbitda) ? fmtNum(last.debtToEbitda, 1) + 'x' : 'N/A'}</span>
      </div>
      <div className="metric-stat">
        <span className="metric-stat-label">Net Debt</span>
        <span className="metric-stat-value" style={{ color: last?.netDebt < 0 ? '#10b981' : '#ef4444' }}>{netDebtStr}</span>
      </div>
      <div className="metric-stat">
        <span className="metric-stat-label">LT Debt</span>
        <span className="metric-stat-value">{fmtBn(last?.longTermDebt ?? NaN)}</span>
      </div>
    </div>
  );

  const summary = "A strong balance sheet gives a company resilience in downturns and freedom to invest aggressively when competitors can't. Debt/EBITDA below 2× is the key threshold.";

  const explanation = (
    <div className="me-body">
      <p className="me-p"><strong>What it measures:</strong> Net Debt (total debt minus cash) relative to EBITDA, and the trend of shareholders' equity over time. Net Debt/EBITDA shows how many years of earnings it would take to pay off all debt.</p>
      <p className="me-p"><strong>Why it matters:</strong> Debt amplifies both gains and losses. A company with no debt and a pile of cash can weather recessions, acquire competitors at distressed prices, and invest in growth — all while levered competitors scramble for survival.</p>
      <p className="me-p"><strong>Example:</strong> During the 2020 COVID crash, Apple had $80B+ in net cash. It kept buybacks running, invested in new products, and emerged stronger. Meanwhile, highly leveraged hotel and airline companies needed government bailouts to survive.</p>
      <p className="me-p"><strong>Scoring thresholds:</strong></p>
      <ul className="me-list">
        <li><strong>10/10</strong> — Net cash positive (no net debt)</li>
        <li><strong>8/10</strong> — Net Debt/EBITDA &lt; 1×</li>
        <li><strong>5/10</strong> — Net Debt/EBITDA 1–2×</li>
        <li><strong>2/10</strong> — Net Debt/EBITDA &gt; 4× (fragile)</li>
      </ul>
      <p className="me-p"><strong>Watch out for:</strong> Some capital-light businesses (like many tech companies) carry debt strategically to fund buybacks at low interest rates — context matters. Also watch for off-balance-sheet liabilities like operating leases or pension obligations.</p>
    </div>
  );

  return (
    <MetricCard number={5} title="Balance Sheet" score={data.scores.balanceSheet} footer={footer} summary={summary} explanation={explanation}>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
          <CartesianGrid stroke="#1a1a2e" vertical={false} />
          <XAxis dataKey="year" tick={TICK_STYLE} />
          <YAxis yAxisId="left" tick={TICK_STYLE} tickFormatter={v => `$${v?.toFixed(0)}B`} />
          <YAxis yAxisId="right" orientation="right" tick={TICK_STYLE} tickFormatter={v => `${v}x`} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
          />
          <Legend wrapperStyle={{ color: '#6b7280', fontSize: 11 }} />
          <Bar yAxisId="left" dataKey="equity" name="Equity" fill="#10b981" fillOpacity={0.7} radius={[2, 2, 0, 0]} />
          <Bar yAxisId="left" dataKey="netDebt" name="Net Debt" fill="#ef4444" fillOpacity={0.7} radius={[2, 2, 0, 0]} />
          <Line yAxisId="right" dataKey="debtToEbitda" name="D/EBITDA" stroke="#f59e0b" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </MetricCard>
  );
}
