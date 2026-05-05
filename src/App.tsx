import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import CompanyHeader from './components/CompanyHeader';
import OverallScore from './components/OverallScore';
import RevenueGrowth from './components/metrics/RevenueGrowth';
import FCFGeneration from './components/metrics/FCFGeneration';
import OperatingMargin from './components/metrics/OperatingMargin';
import ROICMetric from './components/metrics/ROICMetric';
import BalanceSheet from './components/metrics/BalanceSheet';
import EPSGrowth from './components/metrics/EPSGrowth';
import CapExEfficiency from './components/metrics/CapExEfficiency';
import MoatScore from './components/metrics/MoatScore';
import ManagementScore from './components/metrics/ManagementScore';
import Valuation from './components/metrics/Valuation';
import { useStockData } from './hooks/useStockData';
import './styles.css';

const WATCHLIST_KEY = 'av_watchlist';

function loadWatchlist(): string[] {
  try {
    const stored = localStorage.getItem(WATCHLIST_KEY);
    return stored ? (JSON.parse(stored) as string[]) : [];
  } catch { return []; }
}

function saveWatchlist(list: string[]) {
  try { localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

export default function App() {
  const [activeTicker, setActiveTicker] = useState('AAPL');
  const [watchlist, setWatchlist] = useState<string[]>(loadWatchlist);
  const { data, loading, error } = useStockData(activeTicker);

  useEffect(() => {
    if (!data) return;
    setWatchlist(prev => {
      if (prev.includes(data.symbol)) return prev;
      const next = [data.symbol, ...prev].slice(0, 20);
      saveWatchlist(next);
      return next;
    });
  }, [data]);

  function handleSelect(ticker: string) {
    setActiveTicker(ticker.toUpperCase());
  }

  function handleWatchlistRemove(ticker: string) {
    const next = watchlist.filter(t => t !== ticker);
    setWatchlist(next);
    saveWatchlist(next);
  }

  return (
    <div className="layout">
      <Sidebar activeTicker={activeTicker} onSelect={handleSelect} watchlist={watchlist} onRemove={handleWatchlistRemove} />

      <div className="main-content">
        {loading && (
          <div className="loading-state">
            <div className="spinner" />
            <p className="loading-text">Fetching {activeTicker} data…</p>
          </div>
        )}

        {error && !loading && (
          <div className="error-state">
            <div className="error-icon">⚠</div>
            <p className="error-title">Failed to load {activeTicker}</p>
            <p className="error-msg">{error}</p>
          </div>
        )}

        {data && !loading && (
          <>
            <CompanyHeader data={data} />

            <section className="overall-section">
              <h2 className="section-title">Compounder Assessment</h2>
              <OverallScore scores={data.scores} />
            </section>

            <section className="metrics-section">
              <h2 className="section-title">Quality Metrics</h2>
              <div className="metrics-grid">
                <RevenueGrowth data={data} />
                <FCFGeneration data={data} />
                <OperatingMargin data={data} />
                <ROICMetric data={data} />
                <BalanceSheet data={data} />
                <EPSGrowth data={data} />
                <CapExEfficiency data={data} />
                <MoatScore data={data} />
                <ManagementScore data={data} />
                <Valuation data={data} />
              </div>
            </section>

            <footer className="app-footer">
              Data: Alpha Vantage | Cached 24h | Free tier: 25 req/day
            </footer>
          </>
        )}

        {!data && !loading && !error && (
          <div className="empty-state">
            <p>Enter a ticker in the sidebar to begin analysis.</p>
          </div>
        )}
      </div>
    </div>
  );
}
