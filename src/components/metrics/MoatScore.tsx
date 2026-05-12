import {
  ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { StockAnalysis } from '../../types';
import MetricCard from '../MetricCard';
import { fmtPct, mean, TOOLTIP_STYLE, TICK_STYLE_SM } from '../../utils/calculations';

interface Props { data: StockAnalysis }

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="progress-bar-wrap">
      <div className="progress-bar-inner" style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: color }} />
    </div>
  );
}

export default function MoatScore({ data }: Props) {
  const chartData = data.annualData.map(d => ({
    year: d.year,
    grossMargin: Number.isFinite(d.grossMargin) ? +(d.grossMargin * 100).toFixed(1) : null,
    opMargin: Number.isFinite(d.operatingMargin) ? +(d.operatingMargin * 100).toFixed(1) : null,
    roic: Number.isFinite(d.roic) ? +(d.roic * 100).toFixed(1) : null,
  }));

  const avgGM = mean(data.annualData.map(d => d.grossMargin));
  const roics = data.annualData.map(d => d.roic).filter(Number.isFinite);
  const avgROIC = data.avgROIC;
  const roicStd = roics.length > 1
    ? Math.sqrt(roics.reduce((a, r) => a + (r - avgROIC) ** 2, 0) / (roics.length - 1))
    : 0;
  const roicConsistency = roicStd < 0.03 ? 'High' : roicStd < 0.07 ? 'Moderate' : 'Low';
  const consistencyColor = roicConsistency === 'High' ? '#10b981' : roicConsistency === 'Moderate' ? '#f59e0b' : '#ef4444';

  const footer = (
    <div className="metric-stats">
      <div className="metric-stat">
        <span className="metric-stat-label">Avg Gross Margin</span>
        <span className="metric-stat-value">{fmtPct(avgGM)}</span>
      </div>
      <div className="metric-stat">
        <span className="metric-stat-label">ROIC Consistency</span>
        <span className="metric-stat-value" style={{ color: consistencyColor }}>{roicConsistency}</span>
      </div>
    </div>
  );

  const s = data.scores;

  const summary = "Economic moat is the durable competitive advantage that protects a business from rivals. Wide moats — brands, networks, switching costs — let companies sustain premium margins for decades.";

  const explanation = (
    <div className="me-body">
      <p className="me-p"><strong>What it measures:</strong> A composite of gross margin, operating margin, and ROIC — three proxies for competitive durability. High margins that persist over time signal a business with pricing power that competitors haven't been able to erode.</p>
      <p className="me-p"><strong>Types of moats:</strong></p>
      <ul className="me-list">
        <li><strong>Network effects</strong> — value increases with users (Visa, Meta, Airbnb)</li>
        <li><strong>Switching costs</strong> — painful/expensive to leave (Salesforce, Oracle, Adobe)</li>
        <li><strong>Intangible assets</strong> — brands, patents, licenses (Coca-Cola, Disney, Moody's)</li>
        <li><strong>Cost advantages</strong> — structurally cheaper to produce (Amazon AWS, Costco)</li>
        <li><strong>Efficient scale</strong> — niche market too small for competition to bother (Veeva)</li>
      </ul>
      <p className="me-p"><strong>Example:</strong> Moody's has maintained 40–50% operating margins for 20 years. Every bond issued globally requires a rating — and there are only three credible rating agencies. That oligopoly is a textbook moat backed by regulation and trust.</p>
      <p className="me-p"><strong>Scoring thresholds:</strong></p>
      <ul className="me-list">
        <li><strong>10/10</strong> — Gross margin &gt;60%, Op margin &gt;25%, ROIC &gt;20%</li>
        <li><strong>7/10</strong> — Strong margins, slightly below elite thresholds</li>
        <li><strong>3/10</strong> — Average margins, competitive industry</li>
      </ul>
    </div>
  );

  return (
    <MetricCard number={8} title="Moat Score" score={data.scores.moat} footer={footer} summary={summary} explanation={explanation}>
      <ResponsiveContainer width="100%" height={150}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid stroke="#1a1a2e" vertical={false} />
          <XAxis dataKey="year" tick={TICK_STYLE_SM} />
          <YAxis tick={TICK_STYLE_SM} tickFormatter={v => `${v}%`} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(val: unknown, name: unknown) => [typeof val === 'number' ? `${val.toFixed(1)}%` : '', String(name)]}
          />
          <Legend wrapperStyle={{ color: '#6b7280', fontSize: 10 }} />
          <Bar dataKey="grossMargin" name="Gross Margin" fill="#3b82f6" fillOpacity={0.6} radius={[2, 2, 0, 0]} />
          <Bar dataKey="opMargin" name="Op Margin" fill="#10b981" fillOpacity={0.6} radius={[2, 2, 0, 0]} />
          <Bar dataKey="roic" name="ROIC" fill="#8b5cf6" fillOpacity={0.6} radius={[2, 2, 0, 0]} />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="moat-subscores">
        <div className="moat-subscore-row">
          <span className="moat-subscore-label">Revenue Growth</span>
          <ProgressBar value={s.revenueGrowth} max={10} color="#3b82f6" />
          <span className="moat-subscore-val">{s.revenueGrowth.toFixed(1)}</span>
        </div>
        <div className="moat-subscore-row">
          <span className="moat-subscore-label">ROIC Quality</span>
          <ProgressBar value={s.roic} max={10} color="#8b5cf6" />
          <span className="moat-subscore-val">{s.roic.toFixed(1)}</span>
        </div>
        <div className="moat-subscore-row">
          <span className="moat-subscore-label">Margin Quality</span>
          <ProgressBar value={s.operatingMargin} max={10} color="#10b981" />
          <span className="moat-subscore-val">{s.operatingMargin.toFixed(1)}</span>
        </div>
      </div>
    </MetricCard>
  );
}
