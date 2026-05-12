import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';
import type { StockScores } from '../types';
import { scoreColor, gradeLabel } from '../utils/calculations';

interface Props {
  scores: StockScores;
}

const METRICS = [
  { key: 'revenueGrowth', label: 'Revenue', anchor: 'metric-revenue' },
  { key: 'fcf', label: 'FCF', anchor: 'metric-fcf' },
  { key: 'operatingMargin', label: 'Op Margin', anchor: 'metric-opmargin' },
  { key: 'roic', label: 'ROIC', anchor: 'metric-roic' },
  { key: 'balanceSheet', label: 'Balance Sheet', anchor: 'metric-balance' },
  { key: 'epsGrowth', label: 'EPS', anchor: 'metric-eps' },
  { key: 'capEx', label: 'CapEx', anchor: 'metric-capex' },
  { key: 'moat', label: 'Moat', anchor: 'metric-moat' },
  { key: 'management', label: 'Management', anchor: 'metric-management' },
  { key: 'valuation', label: 'Valuation', anchor: 'metric-valuation' },
] as const;

function scrollToMetric(anchor: string) {
  document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function OverallScore({ scores }: Props) {
  const overall = scores.overall;
  const color = scoreColor(overall / 10);
  const grade = gradeLabel(overall);
  const pct = Math.round(overall);

  const radarData = METRICS.map(m => ({
    metric: m.label,
    score: scores[m.key],
    fullMark: 10,
  }));

  // Circular gauge via SVG
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct / 100);

  return (
    <div className="overall-score-card">
      <div className="overall-score-inner">
        <div className="gauge-wrapper">
          <svg viewBox="0 0 140 140" width="140" height="140">
            <circle cx="70" cy="70" r={radius} fill="none" stroke="#1a1a2e" strokeWidth="12" />
            <circle
              cx="70" cy="70" r={radius}
              fill="none"
              stroke={color}
              strokeWidth="12"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              transform="rotate(-90 70 70)"
              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
            />
            <text x="70" y="65" textAnchor="middle" fill={color} fontSize="28" fontWeight="700" fontFamily="Inter, sans-serif">
              {pct}
            </text>
            <text x="70" y="84" textAnchor="middle" fill="#6b7280" fontSize="11" fontFamily="Inter, sans-serif">
              / 100
            </text>
          </svg>
          <div className="gauge-grade" style={{ color }}>{grade}</div>
        </div>

        <div className="radar-wrapper">
          <ResponsiveContainer width="100%" height={320}>
            <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
              <PolarGrid stroke="#1a1a2e" />
              <PolarAngleAxis
                dataKey="metric"
                tick={{ fill: '#6b7280', fontSize: 11 }}
              />
              <Radar
                name="Score"
                dataKey="score"
                stroke={color}
                fill={color}
                fillOpacity={0.2}
                dot={{ fill: color, r: 3 }}
              />
              <Tooltip
                contentStyle={{ background: '#0f0f1a', border: '1px solid #1a1a2e', borderRadius: 8, color: '#e2e8f0' }}
                formatter={(val: unknown) => [`${(val as number).toFixed(1)} / 10`, 'Score']}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="score-breakdown">
        {METRICS.map(m => {
          const s = scores[m.key];
          const c = scoreColor(s);
          return (
            <div key={m.key} className="score-breakdown-item">
              <span className="score-breakdown-label score-breakdown-link" onClick={() => scrollToMetric(m.anchor)}>{m.label}</span>
              <div className="score-breakdown-bar-wrap">
                <div className="score-breakdown-bar" style={{ width: `${s * 10}%`, background: c }} />
              </div>
              <span className="score-breakdown-value" style={{ color: c }}>{s.toFixed(1)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
