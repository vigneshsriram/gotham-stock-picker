import { useState, forwardRef } from 'react';
import type { StockAnalysis } from '../types';
import { fmtBn, fmtNum } from '../utils/calculations';

interface Props {
  data: StockAnalysis;
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-pill">
      <span className="stat-pill-label">{label}</span>
      <span className="stat-pill-value">{value}</span>
    </div>
  );
}

const CompanyHeader = forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
  const [expanded, setExpanded] = useState(false);

  const price = Number.isFinite(data.currentPrice) ? `$${data.currentPrice.toFixed(2)}` : 'N/A';
  const pe = Number.isFinite(data.peRatio) && data.peRatio > 0 ? fmtNum(data.peRatio) : 'N/A';
  const eps = Number.isFinite(data.eps) ? `$${fmtNum(data.eps, 2)}` : 'N/A';
  const beta = Number.isFinite(data.beta) ? fmtNum(data.beta, 2) : 'N/A';
  const high52 = Number.isFinite(data.weekHigh52) ? `$${fmtNum(data.weekHigh52, 2)}` : 'N/A';
  const low52 = Number.isFinite(data.weekLow52) ? `$${fmtNum(data.weekLow52, 2)}` : 'N/A';
  const mktCap = fmtBn(data.marketCap);
  const divYield = Number.isFinite(data.dividendYield) && data.dividendYield > 0
    ? `${(data.dividendYield * 100).toFixed(2)}%` : 'N/A';

  const earningsLabel = data.nextEarnings ? new Date(data.nextEarnings).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;

  return (
    <div className="company-header" ref={ref}>
      <div className="company-header-top">
        <div className="company-title-group">
          <h1 className="company-name">{data.name}</h1>
          <span className="company-ticker">{data.symbol}</span>
        </div>
        <div className="company-badges">
          <span className="badge badge-sector">{data.sector}</span>
          <span className="badge badge-industry">{data.industry}</span>
        </div>
      </div>

      <div className="stats-row">
        <StatPill label="Price" value={price} />
        <StatPill label="P/E" value={pe} />

        <StatPill label="EPS" value={eps} />
        <StatPill label="Beta" value={beta} />
        <StatPill label="52W High" value={high52} />
        <StatPill label="52W Low" value={low52} />
        <StatPill label="Mkt Cap" value={mktCap} />
        <StatPill label="Div Yield" value={divYield} />
      </div>

      {data.description && (
        <div className="company-description">
          <p className={expanded ? '' : 'description-clamped'}>{data.description}</p>
          <button className="expand-btn" onClick={() => setExpanded(!expanded)}>
            {expanded ? 'Show less' : 'Show more'}
          </button>
          {earningsLabel && (
            <div className="next-earnings-badge">
              📅 Next earnings: <strong>{earningsLabel}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

CompanyHeader.displayName = 'CompanyHeader';
export default CompanyHeader;
