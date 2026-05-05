import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { StockAnalysis } from '../../types';
import MetricCard from '../MetricCard';
import { fmtPct, fmtBn, mean, TOOLTIP_STYLE, TICK_STYLE } from '../../utils/calculations';

interface Props { data: StockAnalysis }

export default function ManagementScore({ data }: Props) {
  const shares = data.annualData.map(d => d.sharesOutstanding).filter(v => Number.isFinite(v) && v > 0);
  const baseShares = shares[0] ?? 1;

  const chartData = data.annualData.map(d => ({
    year: d.year,
    fcfMargin: Number.isFinite(d.fcfMargin) ? +(d.fcfMargin * 100).toFixed(1) : null,
    sharesIndex: Number.isFinite(d.sharesOutstanding) && d.sharesOutstanding > 0
      ? +((d.sharesOutstanding / baseShares) * 100).toFixed(1) : null,
  }));

  const firstD = data.annualData[0];
  const lastD = data.annualData[data.annualData.length - 1];

  const shareChange = firstD && lastD && Number.isFinite(firstD.sharesOutstanding) && Number.isFinite(lastD.sharesOutstanding) && firstD.sharesOutstanding > 0
    ? (lastD.sharesOutstanding - firstD.sharesOutstanding) / firstD.sharesOutstanding : NaN;

  const conversions = data.annualData.map(d => d.netIncome > 0 ? d.fcf / d.netIncome : NaN).filter(Number.isFinite);
  const avgConv = mean(conversions);

  const netDebtChange = firstD && lastD ? lastD.netDebt - firstD.netDebt : NaN;

  const shareColor = Number.isFinite(shareChange) ? (shareChange < 0 ? '#10b981' : '#ef4444') : '#6b7280';

  const footer = (
    <div className="metric-stats">
      <div className="metric-stat">
        <span className="metric-stat-label">Share Count Δ</span>
        <span className="metric-stat-value" style={{ color: shareColor }}>
          {Number.isFinite(shareChange) ? `${shareChange >= 0 ? '+' : ''}${fmtPct(shareChange)}` : 'N/A'}
        </span>
      </div>
      <div className="metric-stat">
        <span className="metric-stat-label">Net Debt Δ</span>
        <span className="metric-stat-value">{Number.isFinite(netDebtChange) ? fmtBn(netDebtChange) : 'N/A'}</span>
      </div>
      <div className="metric-stat">
        <span className="metric-stat-label">FCF Conversion</span>
        <span className="metric-stat-value">{Number.isFinite(avgConv) ? avgConv.toFixed(2) + 'x' : 'N/A'}</span>
      </div>
      <div className="metric-stat">
        <span className="metric-stat-label">Avg FCF Margin</span>
        <span className="metric-stat-value">{fmtPct(data.avgFCFMargin)}</span>
      </div>
    </div>
  );

  return (
    <MetricCard number={9} title="Management Quality" score={data.scores.management} footer={footer}>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid stroke="#1a1a2e" vertical={false} />
          <XAxis dataKey="year" tick={TICK_STYLE} />
          <YAxis yAxisId="left" tick={TICK_STYLE} tickFormatter={v => `${v}%`} />
          <YAxis yAxisId="right" orientation="right" tick={TICK_STYLE} tickFormatter={v => `${v}`} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
          />
          <Legend wrapperStyle={{ color: '#6b7280', fontSize: 11 }} />
          <Line yAxisId="left" dataKey="fcfMargin" name="FCF Margin %" stroke="#10b981" strokeWidth={2} dot={false} />
          <Line yAxisId="right" dataKey="sharesIndex" name="Shares (indexed 100)" stroke="#3b82f6" strokeWidth={2} dot={false} strokeDasharray="4 2" />
        </LineChart>
      </ResponsiveContainer>
    </MetricCard>
  );
}
