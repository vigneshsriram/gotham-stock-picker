import { useState } from 'react';
import { setApiKey } from '../api/apiClient';
import { saveApiKeyDB } from '../lib/db';

interface Props {
  userId: string;
  onComplete: () => void;
}

export default function Onboarding({ userId, onComplete }: Props) {
  const [key, setKey] = useState('');
  const [showSteps, setShowSteps] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = key.trim();
    if (!trimmed) return;
    setBusy(true);
    setError('');
    try {
      setApiKey(trimmed);
      await saveApiKeyDB(userId, trimmed);
      onComplete();
    } catch {
      setError('Failed to save key. Please try again.');
      setBusy(false);
    }
  }

  return (
    <div className="onboarding-container">
      <div className="onboarding-card">
        <div className="auth-logo" style={{ marginBottom: 4 }}>
          <span className="sidebar-logo-icon">◆</span>
          <span className="auth-logo-text">Gotham Stock Picker</span>
        </div>
        <p className="auth-subtitle" style={{ marginBottom: 28 }}>One last step to get started</p>

        <div className="onboarding-step">
          <span className="onboarding-step-num">1</span>
          <div>
            <p className="onboarding-step-label">Get a free API key from FMP</p>
            <a
              href="https://financialmodelingprep.com/developer/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="onboarding-link"
            >
              financialmodelingprep.com →
            </a>
          </div>
        </div>

        <div className="onboarding-step">
          <span className="onboarding-step-num">2</span>
          <div style={{ width: '100%' }}>
            <p className="onboarding-step-label">Paste your API key below</p>
            <form onSubmit={handleSave} className="onboarding-key-form">
              <input
                type="text"
                value={key}
                onChange={e => setKey(e.target.value)}
                placeholder="e.g. aBcDeFgHiJkLmNoPqRsT…"
                className="auth-input"
                spellCheck={false}
                autoComplete="off"
              />
              {error && <p className="auth-error">{error}</p>}
              <button type="submit" className="auth-btn-primary" disabled={busy || !key.trim()}>
                {busy ? 'Saving…' : 'Save & Continue'}
              </button>
            </form>
          </div>
        </div>

        <button
          className="onboarding-steps-toggle"
          onClick={() => setShowSteps(v => !v)}
        >
          <span>How to get your FMP API key</span>
          <span>{showSteps ? '▲' : '▼'}</span>
        </button>

        {showSteps && (
          <ol className="onboarding-steps-list">
            <li>Go to <a href="https://financialmodelingprep.com" target="_blank" rel="noopener noreferrer">financialmodelingprep.com</a></li>
            <li>Click <strong>Sign Up</strong> and create a free account</li>
            <li>After signing in, go to your <strong>Dashboard</strong></li>
            <li>Find your API key under <strong>API Keys</strong> section</li>
            <li>Copy and paste it into the field above</li>
          </ol>
        )}
      </div>
    </div>
  );
}
