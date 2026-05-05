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

  return (
    <MetricCard number={8} title="Moat Score" score={data.scores.moat} footer={footer}>
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
