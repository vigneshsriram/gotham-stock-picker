import { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import { loadWatchlistDB, addToWatchlistDB, removeFromWatchlistDB, loadApiKeyDB, saveApiKeyDB } from './lib/db';
import { loadPoolKey } from './lib/keyPool';
import { setApiKey } from './api/apiClient';
import SignIn from './pages/SignIn';
import Onboarding from './pages/Onboarding';
import AdminPanel from './pages/AdminPanel';
import PaperTrading from './pages/PaperTrading';
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
import PeerComparison from './components/PeerComparison';
import RevenueSegments from './components/metrics/RevenueSegments';
import StickyHeader from './components/StickyHeader';
import { useStockData } from './hooks/useStockData';
import logo from './the-moat-logo2.png';
import './styles.css';

function Dashboard() {
  const { user, isAdmin, signOut } = useAuth();
  const [activeTicker, setActiveTicker] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showPaperTrading, setShowPaperTrading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const companyHeaderRef = useRef<HTMLDivElement>(null);
  const [hasKey, setHasKey] = useState<boolean | null>(null); // null = loading
  const { data, loading, error, status } = useStockData(activeTicker, retryKey);

  // Load watchlist and API key on login
  useEffect(() => {
    if (!user) return;
    loadWatchlistDB(user.id).then(setWatchlist);

    if (isAdmin) {
      // Admin uses the shared key pool
      loadPoolKey().then(() => setHasKey(true));
    } else {
      // Regular users use their own personal FMP key
      loadApiKeyDB(user.id).then(key => {
        if (key) {
          setApiKey(key);
          setHasKey(true);
        } else {
          setHasKey(false); // trigger onboarding
        }
      });
    }
  }, [user, isAdmin]);

  useEffect(() => {
    if (!data || !user) return;
    if (watchlist.includes(data.symbol)) return;
    const next = [data.symbol, ...watchlist].slice(0, 20);
    setWatchlist(next);
    addToWatchlistDB(user.id, data.symbol);
  }, [data]);

  function handleSelect(ticker: string) {
    setActiveTicker(ticker.toUpperCase());
    setSidebarOpen(false);
    setSidebarCollapsed(true); // hide sidebar on desktop after search
    setShowPaperTrading(false);
  }

  async function handleRetry() {
    if (isQuotaError && isAdmin) {
      const { clearPoolKeyCache } = await import('./lib/keyPool');
      clearPoolKeyCache();
      await loadPoolKey(true);
    }
    setRetryKey(k => k + 1);
  }

  async function handleWatchlistRemove(ticker: string) {
    setWatchlist(prev => prev.filter(t => t !== ticker));
    if (user) await removeFromWatchlistDB(user.id, ticker);
  }

  async function handleKeySaved(key: string) {
    if (user) await saveApiKeyDB(user.id, key);
  }

  const isQuotaError = error?.includes('quota') || error?.includes('rate limit') || error?.includes('exhausted');

  // Show onboarding for regular users who haven't set a key yet
  if (!isAdmin && hasKey === false) {
    return <Onboarding userId={user!.id} onComplete={() => setHasKey(true)} />;
  }

  // Still loading key state
  if (hasKey === null) {
    return <div className="auth-loading"><div className="spinner" /></div>;
  }

  return (
    <div className={`layout${sidebarOpen ? ' sidebar-open' : ''}${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {!sidebarCollapsed && (
        <Sidebar
          activeTicker={activeTicker}
          onSelect={handleSelect}
          watchlist={watchlist}
          onRemove={handleWatchlistRemove}
          onKeySaved={isAdmin ? undefined : handleKeySaved}
          onSignOut={signOut}
          isAdmin={isAdmin}
          onAdmin={() => setShowAdmin(true)}
          onClose={() => { setSidebarOpen(false); setSidebarCollapsed(true); }}
          onPaperTrading={() => { setShowPaperTrading(true); setSidebarOpen(false); setSidebarCollapsed(true); }}
        />
      )}

      <div className="main-content">
        {showPaperTrading && (
          <PaperTrading onBack={() => setShowPaperTrading(false)} />
        )}
        {!showPaperTrading && <>
        {/* Desktop sidebar reopen button (shown when sidebar is collapsed) */}
        {sidebarCollapsed && (
          <button className="sidebar-reopen-btn" onClick={() => setSidebarCollapsed(false)} aria-label="Open sidebar">
            ☰
          </button>
        )}

        {/* Mobile header bar */}
        <div className="mobile-header">
          <button className="mobile-menu-btn" onClick={() => setSidebarOpen(v => !v)} aria-label="Menu">
            <span /><span /><span />
          </button>
          <span className="mobile-header-title">
            <img src={logo} alt="TheMoat" className="mobile-header-logo" />
          </span>
          {activeTicker && <span className="mobile-header-ticker">{activeTicker}</span>}
        </div>

        {loading && (
          <div className="loading-state">
            <div className="spinner" />
            <p className="loading-text">{status || `Fetching ${activeTicker} data…`}</p>
            {status && <p className="loading-sub">{activeTicker} · 1.3s between requests</p>}
          </div>
        )}

        {error && !loading && (
          <div className="error-state">
            <div className="error-icon">⚠</div>
            <p className="error-title">Failed to load {activeTicker}</p>
            <p className="error-msg">{error}</p>
            {isQuotaError && (
              <p className="error-hint">
                All API keys are at their daily limit. Try again tomorrow or click Retry to switch keys.
              </p>
            )}
            <button className="retry-btn" onClick={handleRetry}>↺ Retry</button>
          </div>
        )}

        {data && !loading && (
          <>
            <StickyHeader data={data} triggerRef={companyHeaderRef} />
            <CompanyHeader data={data} ref={companyHeaderRef} />

            <section className="overall-section">
              <h2 className="section-title">Compounder Assessment</h2>
              <OverallScore scores={data.scores} />
            </section>

            <PeerComparison data={data} onSelect={handleSelect} />

            <section className="metrics-section">
              <h2 className="section-title">Quality Metrics</h2>
              <div className="metrics-grid">
                <div id="metric-revenue"><RevenueGrowth data={data} /></div>
                <div id="metric-segments"><RevenueSegments data={data} /></div>
                <div id="metric-fcf"><FCFGeneration data={data} /></div>
                <div id="metric-opmargin"><OperatingMargin data={data} /></div>
                <div id="metric-roic"><ROICMetric data={data} /></div>
                <div id="metric-balance"><BalanceSheet data={data} /></div>
                <div id="metric-eps"><EPSGrowth data={data} /></div>
                <div id="metric-capex"><CapExEfficiency data={data} /></div>
                <div id="metric-moat"><MoatScore data={data} /></div>
                <div id="metric-management"><ManagementScore data={data} /></div>
                <div id="metric-valuation"><Valuation data={data} /></div>
              </div>
            </section>

            <footer className="app-footer">
              Data: Financial Modeling Prep | Cached 24h
            </footer>
          </>
        )}

        {!activeTicker && !loading && (
          <div className="empty-state">
            <img src={logo} alt="TheMoat" className="empty-logo-img" />
            <h2 className="empty-title">TheMoat</h2>
            <p className="empty-sub">Analyze quality compounders across 10 fundamental metrics</p>
            <p className="empty-prompt">Enter a ticker symbol in the sidebar to begin →</p>
          </div>
        )}
        </>}
      </div>

      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
    </div>
  );
}

function AppInner() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="auth-loading"><div className="spinner" /></div>;
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
