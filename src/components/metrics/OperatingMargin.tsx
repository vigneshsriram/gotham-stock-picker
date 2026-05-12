import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { StockAnalysis } from '../../types';
import MetricCard from '../MetricCard';
import { fmtPct, mean, TOOLTIP_STYLE, TICK_STYLE } from '../../utils/calculations';

interface Props { data: StockAnalysis }

export default function OperatingMargin({ data }: Props) {
  const chartData = data.annualData.map(d => ({
    year: d.year,
    grossMargin: Number.isFinite(d.grossMargin) ? +(d.grossMargin * 100).toFixed(2) : null,
    opMargin: Number.isFinite(d.operatingMargin) ? +(d.operatingMargin * 100).toFixed(2) : null,
  }));

  const avgGross = mean(data.annualData.map(d => d.grossMargin));
  const half = Math.floor(data.annualData.length / 2);
  const oldOp = mean(data.annualData.slice(0, half).map(d => d.operatingMargin));
  const recentOp = mean(data.annualData.slice(half).map(d => d.operatingMargin));
  const trend = Number.isFinite(oldOp) && Number.isFinite(recentOp)
    ? recentOp > oldOp ? 'Expanding ↑' : recentOp < oldOp * 0.95 ? 'Contracting ↓' : 'Stable →'
    : 'N/A';
  const trendColor = trend.includes('Expanding') ? '#10b981' : trend.includes('Contracting') ? '#ef4444' : '#f59e0b';

  const footer = (
    <div className="metric-stats">
      <div className="metric-stat">
        <span className="metric-stat-label">Avg Op Margin</span>
        <span className="metric-stat-value">{fmtPct(data.avgOperatingMargin)}</span>
      </div>
      <div className="metric-stat">
        <span className="metric-stat-label">Avg Gross Margin</span>
        <span className="metric-stat-value">{fmtPct(avgGross)}</span>
      </div>
      <div className="metric-stat">
        <span className="metric-stat-label">Trend</span>
        <span className="metric-stat-value" style={{ color: trendColor }}>{trend}</span>
      </div>
    </div>
  );

  const summary = "Operating margin shows how much profit a company keeps from each dollar of revenue after running the business — a key signal of pricing power and cost discipline.";

  const explanation = (
    <div className="me-body">
      <p className="me-p"><strong>What it measures:</strong> Operating Income ÷ Revenue. This card shows both gross margin (revenue minus cost of goods) and operating margin (after all operating expenses including R&D and SG&A).</p>
      <p className="me-p"><strong>Why it matters:</strong> High and stable operating margins are a hallmark of durable competitive advantages. A company with 30%+ operating margins has significant pricing power and/or structural cost advantages that competitors struggle to replicate.</p>
      <p className="me-p"><strong>Example:</strong> Microsoft's operating margin expanded from ~25% in 2017 to ~45% in 2024 as its Azure and Office 365 subscription businesses scaled — showing the power of software economics at scale.</p>
      <p className="me-p"><strong>Scoring thresholds:</strong></p>
      <ul className="me-list">
        <li><strong>10/10</strong> — Operating margin ≥ 30%</li>
        <li><strong>7/10</strong> — Margin 15–30%</li>
        <li><strong>4/10</strong> — Margin 8–15%</li>
        <li><strong>1/10</strong> — Below 5% or declining trend</li>
      </ul>
      <p className="me-p"><strong>Watch out for:</strong> Margin expansion driven by cutting R&D — that can boost short-term profits while hollowing out future growth. Also compare margins to industry peers, since retail and airlines structurally operate at low margins.</p>
    </div>
  );

  return (
    <MetricCard number={3} title="Operating Margin" score={data.scores.operatingMargin} footer={footer} summary={summary} explanation={explanation}>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id="grossGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="opGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.6} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#1a1a2e" vertical={false} />
          <XAxis dataKey="year" tick={TICK_STYLE} />
          <YAxis tick={TICK_STYLE} tickFormatter={v => `${v}%`} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(val: unknown, name: unknown) => [typeof val === 'number' ? `${val.toFixed(1)}%` : '', String(name)]}
          />
          <Legend wrapperStyle={{ color: '#6b7280', fontSize: 11 }} />
          <Area dataKey="grossMargin" name="Gross Margin" stroke="#3b82f6" fill="url(#grossGrad)" strokeWidth={2} />
          <Area dataKey="opMargin" name="Op Margin" stroke="#10b981" fill="url(#opGrad)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </MetricCard>
  );
}
