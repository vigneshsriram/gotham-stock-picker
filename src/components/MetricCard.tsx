import { useState, useRef } from 'react';
import type { ReactNode } from 'react';
import { scoreColor } from '../utils/calculations';

interface Props {
  number: number;
  title: string;
  score: number;
  children: ReactNode;
  footer?: ReactNode;
  summary?: string;
  explanation?: ReactNode;
}

export default function MetricCard({ number, title, score, children, footer, summary, explanation }: Props) {
  const color = scoreColor(score);
  const [expanded, setExpanded] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const tooltipTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleInfoEnter() {
    if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
    setTooltipVisible(true);
  }

  function handleInfoLeave() {
    tooltipTimeout.current = setTimeout(() => setTooltipVisible(false), 150);
  }

  function handleInfoClick(e: React.MouseEvent) {
    e.stopPropagation();
  }

  return (
    <div className={`metric-card${expanded ? ' metric-card-expanded' : ''}`} onClick={() => setExpanded(v => !v)} style={{ cursor: 'pointer' }}>
      <div className="metric-card-header">
        <div className="metric-card-title-group">
          <span className="metric-number">#{number}</span>
          <span className="metric-title">{title}</span>
          {summary && (
            <div className="metric-info-wrap" onMouseEnter={handleInfoEnter} onMouseLeave={handleInfoLeave} onClick={handleInfoClick}>
              <button className="metric-info-btn" aria-label="Info">ⓘ</button>
              {tooltipVisible && (
                <div className="metric-info-tooltip">{summary}</div>
              )}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="metric-score-badge" style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}>
            {score.toFixed(1)} / 10
          </div>
          <span className="metric-expand-chevron">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      <div className="metric-card-body">{children}</div>
      {footer && <div className="metric-card-footer">{footer}</div>}

      {expanded && explanation && (
        <div className="metric-explanation" onClick={e => e.stopPropagation()}>
          <div className="metric-explanation-divider" />
          {explanation}
        </div>
      )}
    </div>
  );
}
