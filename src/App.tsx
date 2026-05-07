import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import { loadWatchlistDB, addToWatchlistDB, removeFromWatchlistDB, loadApiKeyDB, saveApiKeyDB } from './lib/db';
import { setApiKey } from './api/alphaVantage';
import SignIn from './pages/SignIn';
import AdminPanel from './pages/AdminPanel';
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
import { hasApiKey } from './api/alphaVantage';
import './styles.css';

function Dashboard() {
  const { user, isAdmin, signOut } = useAuth();
  const [activeTicker, setActiveTicker] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [showAdmin, setShowAdmin] = useState(false);
  const { data, loading, error } = useStockData(activeTicker, retryKey);

  // Load watchlist and API key from Supabase on login
  useEffect(() => {
    if (!user) return;
    loadWatchlistDB(user.id).then(setWatchlist);
    loadApiKeyDB(user.id).then(key => {
      if (key) setApiKey(key);
    });
  }, [user]);

  useEffect(() => {
    if (!data || !user) return;
    if (watchlist.includes(data.symbol)) return;
    const next = [data.symbol, ...watchlist].slice(0, 20);
    setWatchlist(next);
    addToWatchlistDB(user.id, data.symbol);
  }, [data]);

  function handleSelect(ticker: string) {
    setActiveTicker(ticker.toUpperCase());
  }

  function handleRetry() {
    setRetryKey(k => k + 1);
  }

  async function handleWatchlistRemove(ticker: string) {
    setWatchlist(prev => prev.filter(t => t !== ticker));
    if (user) await removeFromWatchlistDB(user.id, ticker);
  }

  async function handleKeySaved(key: string) {
    if (user) await saveApiKeyDB(user.id, key);
    handleRetry();
  }

  const isQuotaError = error?.includes('quota') || error?.includes('rate limit');

  return (
    <div className="layout">
      <Sidebar
        activeTicker={activeTicker}
        onSelect={handleSelect}
        watchlist={watchlist}
        onRemove={handleWatchlistRemove}
        onKeySaved={handleKeySaved}
        onSignOut={signOut}
        isAdmin={isAdmin}
        onAdmin={() => setShowAdmin(true)}
      />

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
            {isQuotaError && (
              <p className="error-hint">
                Enter a fresh API key in the sidebar under <strong>API KEY ▼</strong>, then click Retry.
              </p>
            )}
            <button className="retry-btn" onClick={handleRetry}>↺ Retry</button>
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

        {!activeTicker && !loading && (
          <div className="empty-state">
            <div className="empty-logo">◆</div>
            <h2 className="empty-title">Gotham Stock Picker</h2>
            <p className="empty-sub">Analyze quality compounders across 10 fundamental metrics</p>
            {!hasApiKey() && (
              <div className="empty-key-warning">
                <span className="empty-key-icon">🔑</span>
                <span>Set your <strong>Alpha Vantage API key</strong> in the sidebar first — click <strong>API KEY ▼</strong> at the bottom left.</span>
              </div>
            )}
            <p className="empty-prompt">Enter a ticker symbol in the sidebar to begin →</p>
          </div>
        )}
      </div>

      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
    </div>
  );
}

function AppInner() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-loading">
        <div className="spinner" />
      </div>
    );
  }

  return user ? <Dashboard /> : <SignIn />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
