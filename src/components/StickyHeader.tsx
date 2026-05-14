import { useEffect, useState } from 'react';
import type { StockAnalysis } from '../types';

interface Props {
  data: StockAnalysis;
  triggerRef: React.RefObject<HTMLElement>; // header hides until this element scrolls out of view
}

export default function StickyHeader({ data, triggerRef }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = triggerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [triggerRef]);

  const isUp = Number.isFinite(data.priceChange) && data.priceChange >= 0;
  const changeColor = !Number.isFinite(data.priceChange) ? '#94a3b8'
    : isUp ? '#34d399' : '#f87171';

  const fmtChange = (n: number) =>
    Number.isFinite(n) ? `${n >= 0 ? '+' : ''}$${Math.abs(n).toFixed(2)}` : '';
  const fmtPct = (n: number) =>
    Number.isFinite(n) ? `(${n >= 0 ? '+' : ''}${n.toFixed(2)}%)` : '';

  return (
    <div className={`sticky-header${visible ? ' sticky-header-visible' : ''}`}>
      <div className="sticky-header-inner">
        <div className="sticky-header-left">
          <span className="sticky-header-name">{data.name}</span>
          <span className="sticky-header-ticker">{data.symbol}</span>
        </div>
        <div className="sticky-header-right">
          <span className="sticky-header-price">
            ${Number.isFinite(data.currentPrice) ? data.currentPrice.toFixed(2) : '—'}
          </span>
          <span className="sticky-header-change" style={{ color: changeColor }}>
            {fmtChange(data.priceChange)} {fmtPct(data.priceChangePct)}
          </span>
        </div>
      </div>
    </div>
  );
}
