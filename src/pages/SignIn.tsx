import { useState } from 'react';
import { useAuth } from '../lib/auth';

export default function SignIn() {
  const { signInWithPassword, signUp } = useAuth();
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');
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

  return (
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
            onClick={() => { setTab('signin'); setError(''); setInfo(''); }}
          >Sign In</button>
          <button
            className={`auth-tab${tab === 'signup' ? ' active' : ''}`}
            onClick={() => { setTab('signup'); setError(''); setInfo(''); }}
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
          {error && <p className="auth-error">{error}</p>}
          {info && <p className="auth-info">{info}</p>}
          <button type="submit" className="auth-btn-primary" disabled={busy}>
            {busy ? 'Please wait…' : tab === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
