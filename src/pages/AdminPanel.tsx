import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import {
  listUsersDB, deleteUserDB, type UserProfile,
  listStockCacheDB, clearStockCacheDB, deleteStockCacheEntryDB, type StockCacheMeta,
} from '../lib/db';

interface Props {
  onClose: () => void;
}

type Tab = 'users' | 'cache';

export default function AdminPanel({ onClose }: Props) {
  const { user: adminUser } = useAuth();
  const [tab, setTab] = useState<Tab>('users');

  // ── Users ──
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [userError, setUserError] = useState('');

  // ── Cache ──
  const [cache, setCache] = useState<StockCacheMeta[]>([]);
  const [cacheLoading, setCacheLoading] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);
  const [deletingTicker, setDeletingTicker] = useState<string | null>(null);
  const [cacheError, setCacheError] = useState('');
  const [cacheMsg, setCacheMsg] = useState('');

  useEffect(() => {
    listUsersDB().then(u => { setUsers(u); setUsersLoading(false); });
  }, []);

  useEffect(() => {
    if (tab !== 'cache') return;
    setCacheLoading(true);
    listStockCacheDB().then(rows => { setCache(rows); setCacheLoading(false); });
  }, [tab]);

  async function handleDeleteUser(userId: string, email: string) {
    if (!confirm(`Remove user ${email}? This cannot be undone.`)) return;
    setDeleting(userId);
    setUserError('');
    const err = await deleteUserDB(userId);
    if (err) setUserError(err);
    else setUsers(prev => prev.filter(u => u.id !== userId));
    setDeleting(null);
  }

  async function handleClearAll() {
    if (!confirm('Delete ALL cached stock data? Users will re-fetch from FMP next search.')) return;
    setClearingAll(true);
    setCacheError('');
    const err = await clearStockCacheDB();
    if (err) setCacheError(err);
    else { setCache([]); setCacheMsg(`Cache cleared at ${new Date().toLocaleTimeString()}`); }
    setClearingAll(false);
  }

  async function handleDeleteTicker(symbol: string) {
    setDeletingTicker(symbol);
    setCacheError('');
    const err = await deleteStockCacheEntryDB(symbol);
    if (err) setCacheError(err);
    else setCache(prev => prev.filter(r => r.symbol !== symbol));
    setDeletingTicker(null);
  }

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return (
    <div className="admin-overlay">
      <div className="admin-panel">
        <div className="admin-header">
          <h2 className="admin-title">Admin</h2>
          <button className="admin-close" onClick={onClose}>×</button>
        </div>

        {/* Tabs */}
        <div className="admin-tabs">
          <button className={`admin-tab${tab === 'users' ? ' admin-tab-active' : ''}`} onClick={() => setTab('users')}>
            Users ({users.length})
          </button>
          <button className={`admin-tab${tab === 'cache' ? ' admin-tab-active' : ''}`} onClick={() => setTab('cache')}>
            Stock Cache ({cache.length})
          </button>
        </div>

        {/* ── Users tab ── */}
        {tab === 'users' && (
          <>
            {usersLoading && <p className="admin-loading">Loading users…</p>}
            {userError && <p className="auth-error">{userError}</p>}
            {!usersLoading && (
              <table className="admin-table">
                <thead>
                  <tr><th>Email</th><th>Joined</th><th></th></tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className={u.id === adminUser?.id ? 'admin-row-self' : ''}>
                      <td>{u.email}</td>
                      <td>{new Date(u.created_at).toLocaleDateString()}</td>
                      <td>
                        {u.id !== adminUser?.id && (
                          <button
                            className="admin-remove-btn"
                            onClick={() => handleDeleteUser(u.id, u.email)}
                            disabled={deleting === u.id}
                          >
                            {deleting === u.id ? '…' : 'Remove'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {/* ── Cache tab ── */}
        {tab === 'cache' && (
          <>
            <div className="admin-cache-toolbar">
              <span className="admin-cache-hint">
                {cache.length} stock{cache.length !== 1 ? 's' : ''} cached
              </span>
              <button
                className="admin-clear-cache-btn"
                onClick={handleClearAll}
                disabled={clearingAll || cache.length === 0}
              >
                {clearingAll ? 'Clearing…' : '🗑 Clear All'}
              </button>
            </div>

            {cacheError && <p className="auth-error">{cacheError}</p>}
            {cacheMsg && <p className="admin-cache-msg">✓ {cacheMsg}</p>}

            {cacheLoading && <p className="admin-loading">Loading cache…</p>}

            {!cacheLoading && cache.length === 0 && (
              <p className="admin-loading">No stocks cached yet.</p>
            )}

            {!cacheLoading && cache.length > 0 && (
              <table className="admin-table">
                <thead>
                  <tr><th>Ticker</th><th>Cached</th><th>Expires</th><th></th></tr>
                </thead>
                <tbody>
                  {cache.map(r => {
                    const expired = r.next_earnings ? new Date(r.next_earnings) < new Date() : false;
                    return (
                      <tr key={r.symbol}>
                        <td><strong>{r.symbol}</strong></td>
                        <td>{fmtDate(r.fetched_at)}</td>
                        <td>
                          {r.next_earnings
                            ? <span style={{ color: expired ? '#f87171' : '#34d399' }}>
                                {expired ? '⚠ ' : ''}{fmtDate(r.next_earnings)}
                              </span>
                            : <span style={{ color: '#6b7280' }}>90-day TTL</span>
                          }
                        </td>
                        <td>
                          <button
                            className="admin-remove-btn"
                            onClick={() => handleDeleteTicker(r.symbol)}
                            disabled={deletingTicker === r.symbol}
                          >
                            {deletingTicker === r.symbol ? '…' : 'Delete'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  );
}
