import { useState } from 'react';
import type { StockAnalysis } from '../../types';
import MetricCard from '../MetricCard';
import { calcDCF, fmtNum, fmtPct, fmtPrice } from '../../utils/calculations';

interface Props { data: StockAnalysis }

function Slider({ label, value, min, max, step, onChange, format }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; format: (v: number) => string;
}) {
  return (
    <div className="dcf-slider">
      <div className="dcf-slider-header">
        <span className="dcf-slider-label">{label}</span>
        <span className="dcf-slider-value">{format(value)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="range-input"
      />
    </div>
  );
}

export default function Valuation({ data }: Props) {
  const [growth, setGrowth] = useState(data.dcfInputs.growth);
  const [discount, setDiscount] = useState(data.dcfInputs.discount);
  const [terminal, setTerminal] = useState(data.dcfInputs.terminal);

  const lastD = data.annualData[data.annualData.length - 1];
  const latestFCF = lastD?.fcf ?? NaN;
  const sharesOut = lastD?.sharesOutstanding ?? NaN;
  const intrinsic = calcDCF(latestFCF, sharesOut, { growth, discount, terminal });
  const price = data.currentPrice;
  const marginOfSafety = Number.isFinite(intrinsic) && intrinsic > 0 && Number.isFinite(price)
    ? (intrinsic - price) / intrinsic : NaN;

  const isUndervalued = Number.isFinite(marginOfSafety) && marginOfSafety > 0;
  const barWidth = Number.isFinite(intrinsic) && intrinsic > 0 && Number.isFinite(price)
    ? Math.min(100, (price / intrinsic) * 100) : 50;

  const evFcf = Number.isFinite(data.marketCap) && Number.isFinite(latestFCF) && latestFCF > 0
    ? data.marketCap / latestFCF : NaN;
  const fcfYield = Number.isFinite(data.marketCap) && Number.isFinite(latestFCF) && data.marketCap > 0
    ? latestFCF / data.marketCap : NaN;

  const compRows = [
    {
      label: 'P/E Ratio',
      current: Number.isFinite(data.peRatio) && data.peRatio > 0 ? fmtNum(data.peRatio) + 'x' : 'N/A',
      status: !Number.isFinite(data.peRatio) ? 'N/A' : data.peRatio < 18 ? 'Cheap' : data.peRatio < 30 ? 'Fair' : 'Expensive',
      statusColor: !Number.isFinite(data.peRatio) ? '#6b7280' : data.peRatio < 18 ? '#10b981' : data.peRatio < 30 ? '#f59e0b' : '#ef4444',
    },
    {
      label: 'PEG Ratio',
      current: Number.isFinite(data.pegRatio) && data.pegRatio > 0 ? fmtNum(data.pegRatio, 2) + 'x' : 'N/A',
      status: !Number.isFinite(data.pegRatio) ? 'N/A' : data.pegRatio < 1 ? 'Cheap' : data.pegRatio < 2 ? 'Fair' : 'Expensive',
      statusColor: !Number.isFinite(data.pegRatio) ? '#6b7280' : data.pegRatio < 1 ? '#10b981' : data.pegRatio < 2 ? '#f59e0b' : '#ef4444',
    },
    {
      label: 'EV/FCF',
      current: Number.isFinite(evFcf) ? fmtNum(evFcf) + 'x' : 'N/A',
      status: !Number.isFinite(evFcf) ? 'N/A' : evFcf < 15 ? 'Cheap' : evFcf < 25 ? 'Fair' : 'Expensive',
      statusColor: !Number.isFinite(evFcf) ? '#6b7280' : evFcf < 15 ? '#10b981' : evFcf < 25 ? '#f59e0b' : '#ef4444',
    },
    {
      label: 'FCF Yield',
      current: Number.isFinite(fcfYield) ? fmtPct(fcfYield, 2) : 'N/A',
      status: !Number.isFinite(fcfYield) ? 'N/A' : fcfYield > 0.06 ? 'High' : fcfYield > 0.03 ? 'Moderate' : 'Low',
      statusColor: !Number.isFinite(fcfYield) ? '#6b7280' : fcfYield > 0.06 ? '#10b981' : fcfYield > 0.03 ? '#f59e0b' : '#ef4444',
    },
  ];

  const mosColor = !Number.isFinite(marginOfSafety) ? '#6b7280'
    : marginOfSafety > 0.30 ? '#10b981'
    : marginOfSafety > 0.10 ? '#3b82f6'
    : marginOfSafety > 0 ? '#f59e0b'
    : '#ef4444';

  const footer = (
    <div className="metric-stats">
      <div className="metric-stat">
        <span className="metric-stat-label">Margin of Safety</span>
        <span className="metric-stat-value" style={{ color: mosColor }}>
          {Number.isFinite(marginOfSafety) ? fmtPct(marginOfSafety) : 'N/A'}
        </span>
      </div>
      <div className="metric-stat">
        <span className="metric-stat-label">Grade</span>
        <span className="metric-stat-value" style={{ color: mosColor }}>
          {!Number.isFinite(marginOfSafety) ? 'N/A'
            : marginOfSafety > 0.30 ? 'Deep Value'
            : marginOfSafety > 0.10 ? 'Undervalued'
            : marginOfSafety > 0 ? 'Fairly Valued'
            : 'Overvalued'}
        </span>
      </div>
    </div>
  );

  const summary = "Valuation tells you what price you're paying for the business. Even a great company is a bad investment if you overpay — use the DCF to find a margin of safety.";

  const explanation = (
    <div className="me-body">
      <p className="me-p"><strong>What it measures:</strong> A Discounted Cash Flow (DCF) model estimates intrinsic value by projecting future free cash flows and discounting them back to today. It also shows P/E, PEG ratio, EV/FCF, and FCF Yield for quick cross-checks.</p>
      <p className="me-p"><strong>How the DCF works:</strong> You set three inputs — (1) expected FCF growth rate over 10 years, (2) discount rate (your required annual return), and (3) terminal growth rate after year 10. The model calculates what the stock is worth today given those assumptions.</p>
      <p className="me-p"><strong>Key multiples explained:</strong></p>
      <ul className="me-list">
        <li><strong>P/E</strong> — price per dollar of earnings. High P/E is only justified if growth is high.</li>
        <li><strong>PEG</strong> — P/E ÷ growth rate. Below 1.0 often signals undervaluation relative to growth.</li>
        <li><strong>EV/FCF</strong> — enterprise value relative to free cash flow. More complete than P/E as it includes debt.</li>
        <li><strong>FCF Yield</strong> — FCF ÷ market cap. Like a bond yield for stocks — higher is better value.</li>
      </ul>
      <p className="me-p"><strong>Example:</strong> A stock at 30× P/E sounds expensive, but if it grows earnings at 25% per year, its PEG is only 1.2 — reasonable. The same 30× P/E on a 5% grower gives a PEG of 6.0 — wildly overvalued.</p>
      <p className="me-p"><strong>Margin of safety:</strong> Always demand a 20–30% discount to your DCF estimate. Models are wrong — the margin of safety is your protection against optimistic assumptions.</p>
    </div>
  );

  return (
    <MetricCard number={10} title="Valuation" score={data.scores.valuation} footer={footer} summary={summary} explanation={explanation}>
      <div className="valuation-body">
        <div className="dcf-sliders">
          <Slider label="FCF Growth Rate" value={growth} min={0.01} max={0.25} step={0.005}
            onChange={setGrowth} format={v => fmtPct(v)} />
          <Slider label="Discount Rate" value={discount} min={0.05} max={0.15} step={0.005}
            onChange={setDiscount} format={v => fmtPct(v)} />
          <Slider label="Terminal Growth" value={terminal} min={0.01} max={0.05} step={0.005}
            onChange={setTerminal} format={v => fmtPct(v)} />
        </div>

        <div className="dcf-result">
          <div className="dcf-value-row">
            <div className="dcf-value-item">
              <span className="dcf-label">Intrinsic Value</span>
              <span className="dcf-number" style={{ color: '#10b981' }}>{fmtPrice(intrinsic)}</span>
            </div>
            <div className="dcf-value-item">
              <span className="dcf-label">Current Price</span>
              <span className="dcf-number">{fmtPrice(price)}</span>
            </div>
          </div>

          {Number.isFinite(intrinsic) && Number.isFinite(price) && (
            <div className="price-bar-wrap">
              <div className="price-bar-bg">
                <div
                  className="price-bar-fill"
                  style={{
                    width: `${barWidth}%`,
                    background: isUndervalued ? '#10b981' : '#ef4444',
                  }}
                />
                <div className="price-bar-label-iv">IV: {fmtPrice(intrinsic, 0)}</div>
                <div className="price-bar-label-price" style={{ left: `${barWidth}%`, color: isUndervalued ? '#10b981' : '#ef4444' }}>
                  {fmtPrice(price, 0)}
                </div>
              </div>
              <div className="price-bar-desc" style={{ color: isUndervalued ? '#10b981' : '#ef4444' }}>
                {isUndervalued ? `${fmtPct(marginOfSafety)} below intrinsic value` : `${fmtPct(Math.abs(marginOfSafety))} above intrinsic value`}
              </div>
            </div>
          )}
        </div>

        <table className="comp-table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>Current</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {compRows.map(row => (
              <tr key={row.label}>
                <td>{row.label}</td>
                <td>{row.current}</td>
                <td style={{ color: row.statusColor }}>{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </MetricCard>
  );
}
