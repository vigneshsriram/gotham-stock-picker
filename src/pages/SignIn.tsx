import { useState } from 'react';
import { useAuth } from '../lib/auth';
import TermsModal from './TermsModal';

export default function SignIn() {
  const { signInWithPassword, signUp } = useAuth();
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');
    if (tab === 'signup' && !agreedToTerms) {
      setError('Please agree to the Terms & Conditions to create an account.');
      return;
    }
    setBusy(true);
    const fn = tab === 'signin' ? signInWithPassword : signUp;
    const err = await fn(email, password);
    setBusy(false);
    if (err) {
      setError(err);
    } else if (tab === 'signup') {
      setInfo('Check your email to confirm your account, then sign in.');
    }
  }

  function switchTab(t: 'signin' | 'signup') {
    setTab(t);
    setError('');
    setInfo('');
    setAgreedToTerms(false);
  }

  return (
    <>
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-logo">
            <span className="sidebar-logo-icon">◆</span>
            <span className="auth-logo-text">Gotham</span>
          </div>
          <p className="auth-subtitle">Stock Picker</p>

          <div className="auth-tabs">
            <button
              className={`auth-tab${tab === 'signin' ? ' active' : ''}`}
              onClick={() => switchTab('signin')}
            >Sign In</button>
            <button
              className={`auth-tab${tab === 'signup' ? ' active' : ''}`}
              onClick={() => switchTab('signup')}
            >Sign Up</button>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="auth-input"
              autoComplete="email"
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              required
              className="auth-input"
              autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
            />

            {tab === 'signup' && (
              <label className="terms-checkbox-row">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={e => setAgreedToTerms(e.target.checked)}
                  className="terms-checkbox"
                />
                <span>
                  I agree to the{' '}
                  <button
                    type="button"
                    className="terms-inline-link"
                    onClick={() => setShowTerms(true)}
                  >
                    Terms &amp; Conditions
                  </button>
                  . I understand this is an educational tool and not financial advice.
                </span>
              </label>
            )}

            {error && <p className="auth-error">{error}</p>}
            {info && <p className="auth-info">{info}</p>}

            <button type="submit" className="auth-btn-primary" disabled={busy}>
              {busy ? 'Please wait…' : tab === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {tab === 'signin' && (
            <p className="terms-footer-note">
              By signing in you confirm you have read and agreed to our{' '}
              <button type="button" className="terms-inline-link" onClick={() => setShowTerms(true)}>
                Terms &amp; Conditions
              </button>.
            </p>
          )}
        </div>
      </div>

      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
    </>
  );
}
