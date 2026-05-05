import type { ReactNode } from 'react';
import { scoreColor } from '../utils/calculations';

interface Props {
  number: number;
  title: string;
  score: number;
  children: ReactNode;
  footer?: ReactNode;
}

export default function MetricCard({ number, title, score, children, footer }: Props) {
  const color = scoreColor(score);

  return (
    <div className="metric-card">
      <div className="metric-card-header">
        <div className="metric-card-title-group">
          <span className="metric-number">#{number}</span>
          <span className="metric-title">{title}</span>
        </div>
        <div className="metric-score-badge" style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}>
          {score.toFixed(1)} / 10
        </div>
      </div>
      <div className="metric-card-body">{children}</div>
      {footer && <div className="metric-card-footer">{footer}</div>}
    </div>
  );
}
