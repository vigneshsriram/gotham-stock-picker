import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { StockAnalysis } from '../../types';
import MetricCard from '../MetricCard';
import { fmtPct, fmtNum, mean, TOOLTIP_STYLE, TICK_STYLE } from '../../utils/calculations';

interface Props { data: StockAnalysis }

export default function CapExEfficiency({ data }: Props) {
  const chartData = data.annualData.map(d => ({
    year: d.year,
    capExPct: Number.isFinite(d.capExPct) ? +(d.capExPct * 100).toFixed(2) : null,
  }));

  const avgCapExPct = mean(data.annualData.map(d => d.capExPct));
  const lastD = data.annualData[data.annualData.length - 1];
  const fcfCapEx = lastD && Number.isFinite(lastD.fcf) && Number.isFinite(lastD.capEx) && lastD.capEx > 0
    ? lastD.fcf / lastD.capEx : NaN;

  const classification = !Number.isFinite(avgCapExPct) ? 'N/A'
    : avgCapExPct < 0.04 ? 'Asset-Light'
    : avgCapExPct < 0.10 ? 'Moderate CapEx'
    : 'Capital-Intensive';

  const classColor = classification === 'Asset-Light' ? '#10b981'
    : classification === 'Moderate CapEx' ? '#f59e0b' : '#ef4444';

  const footer = (
    <div className="metric-stats">
      <div className="metric-stat">
        <span className="metric-stat-label">Avg CapEx %</span>
        <span className="metric-stat-value">{fmtPct(avgCapExPct)}</span>
      </div>
      <div className="metric-stat">
        <span className="metric-stat-label">FCF/CapEx</span>
        <span className="metric-stat-value">{Number.isFinite(fcfCapEx) ? fmtNum(fcfCapEx, 1) + 'x' : 'N/A'}</span>
      </div>
      <div className="metric-stat">
        <span className="metric-stat-label">Classification</span>
        <span className="metric-stat-value" style={{ color: classColor }}>{classification}</span>
      </div>
    </div>
  );

  return (
    <MetricCard number={7} title="CapEx Efficiency" score={data.scores.capEx} footer={footer}>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid stroke="#1a1a2e" vertical={false} />
          <XAxis dataKey="year" tick={TICK_STYLE} />
          <YAxis tick={TICK_STYLE} tickFormatter={v => `${v}%`} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(val: unknown) => [typeof val === 'number' ? `${val.toFixed(1)}%` : '', 'CapEx % of Rev']}
          />
          <ReferenceLine y={5} stroke="#10b981" strokeDasharray="4 4" label={{ value: '5% (asset-light)', fill: '#10b981', fontSize: 10 }} />
          <Line dataKey="capExPct" name="CapEx % of Revenue" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </MetricCard>
  );
}
