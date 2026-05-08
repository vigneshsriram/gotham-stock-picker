import { useState } from 'react';
import { getApiKey, setApiKey } from '../api/alphaVantage';

interface Props {
  activeTicker: string;
  onSelect: (t: string) => void;
  watchlist: string[];
  onRemove: (t: string) => void;
  onSignOut?: () => void;
  isAdmin?: boolean;
  onAdmin?: () => void;
}

export default function Sidebar({ activeTicker, onSelect, watchlist, onRemove, onSignOut, isAdmin, onAdmin }: Props) {
  const [draft, setDraft] = useState('');
  const [apiKey, setApiKeyState] = useState(() => getApiKey());
  const [apiKeyDraft, setApiKeyDraft] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [saved, setSaved] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ticker = draft.trim().toUpperCase();
    if (!ticker) return;
    onSelect(ticker);
    setDraft('');
  }

  function removeTicker(ticker: string, e: React.MouseEvent) {
    e.stopPropagation();
    onRemove(ticker);
  }

  function handleSaveKey(e: React.FormEvent) {
    e.preventDefault();
    const key = apiKeyDraft.trim();
    if (!key) return;
    setApiKey(key);
    setApiKeyState(key);
    setApiKeyDraft('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const maskedKey = apiKey ? `${apiKey.slice(0, 4)}${'•'.repeat(Math.max(0, apiKey.length - 4))}` : 'Not set';

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="sidebar-logo-icon">◆</span>
        <span className="sidebar-logo-text">Gotham</span>
      </div>

      <form onSubmit={handleSubmit} className="sidebar-search">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="Enter ticker…"
          spellCheck={false}
          autoCapitalize="characters"
          className="sidebar-input"
        />
        <button type="submit" className="sidebar-search-btn">→</button>
      </form>

      <div className="sidebar-section-label">WATCHLIST</div>
      <ul className="watchlist">
        {watchlist.length === 0 && (
          <li className="watchlist-empty">No tickers saved yet</li>
        )}
        {watchlist.map(ticker => (
          <li
            key={ticker}
            className={`watchlist-item${ticker === activeTicker ? ' active' : ''}`}
            onClick={() => onSelect(ticker)}
          >
            <span className="watchlist-ticker">{ticker}</span>
            <button
              className="watchlist-remove"
              onClick={e => removeTicker(ticker, e)}
              title="Remove"
            >×</button>
          </li>
        ))}
      </ul>

      {isAdmin && <div className="sidebar-api-section">
        <button
          className="sidebar-api-toggle"
          onClick={() => setShowApiKey(v => !v)}
        >
          <span>API KEY</span>
          <span className="sidebar-api-chevron">{showApiKey ? '▲' : '▼'}</span>
        </button>

        {showApiKey && (
          <div className="sidebar-api-body">
            <p className="sidebar-api-current">Current: <span>{maskedKey}</span></p>
            <form onSubmit={handleSaveKey} className="sidebar-api-form">
              <input
                value={apiKeyDraft}
                onChange={e => setApiKeyDraft(e.target.value)}
                placeholder="Paste new key…"
                className="sidebar-input sidebar-api-input"
                spellCheck={false}
                autoComplete="off"
              />
              <button type="submit" className="sidebar-api-save">
                {saved ? '✓ Saved' : 'Save'}
              </button>
            </form>
            <p className="sidebar-api-hint">
              Get a key at financialmodelingprep.com
            </p>
          </div>
        )}
      </div>}

      <div className="sidebar-footer">
        {isAdmin && (
          <button className="sidebar-footer-btn" onClick={onAdmin}>
            ⚙ Admin
          </button>
        )}
        <button className="sidebar-footer-btn sidebar-signout" onClick={onSignOut}>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
