import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { Alert, Logo } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { SESSION_EXPIRED_FLAG } from '../services/api';
import { authApi } from '../services/platformApi';
import { PANEL_ROLES } from '../types';
import './login.css';

// Seeded demo accounts that exist only in the local in-memory database.
// The buttons are stripped from production builds (import.meta.env.DEV).
const DEV_DEMO_PASSWORD = 'Demo@12345';
const DEV_DEMO_ACCOUNTS = [
  { label: 'Super Admin', email: 'superadmin@sseuropa.demo' },
  { label: 'Admin', email: 'admin@sseuropa.demo' },
  { label: 'Staff', email: 'staff@sseuropa.demo' },
  { label: 'Teacher', email: 'mentor@sseuropa.demo' },
];

type Mode = 'login' | 'otp' | 'forgot' | 'reset';

const FEATURES = [
  { icon: Icon.Inbox, text: 'Follow up every website enquiry' },
  { icon: Icon.Book, text: 'Build lessons with words, audio and exercises' },
  { icon: Icon.Video, text: 'Schedule live classes and notify students' },
];

export function LoginPage() {
  const { token, user, loginWithPassword, verifyOtp, loading } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [otpHint, setOtpHint] = useState<string | null>(null);
  const [resetChallengeId, setResetChallengeId] = useState<string | null>(null);
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);

  // Shown once after the server rejected a saved login.
  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_EXPIRED_FLAG)) {
        sessionStorage.removeItem(SESSION_EXPIRED_FLAG);
        setExpired(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  if (token && user && PANEL_ROLES.includes(user.role)) return <Navigate to="/app" replace />;

  const go = (m: Mode) => {
    setMode(m);
    setError(null);
    setInfo(null);
  };

  async function signIn(mail: string, pass: string) {
    setError(null);
    setInfo(null);
    setExpired(false);
    try {
      const result = await loginWithPassword(mail.trim(), pass);
      if (result.requiresOtp && result.pendingUserId) {
        setPendingUserId(result.pendingUserId);
        setOtpHint(result.demoOtpHint ?? null);
        go('otp');
        return;
      }
      navigate('/app');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed. Please check your email and password.');
    }
  }

  async function onVerify(e: FormEvent) {
    e.preventDefault();
    if (!pendingUserId) return;
    setError(null);
    try {
      await verifyOtp(pendingUserId, otp.trim());
      navigate('/app');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That code did not work. Please try again.');
    }
  }

  async function onSendResetCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await authApi.forgotPassword(email.trim());
      setResetChallengeId(res.challengeId);
      go('reset');
      setInfo(import.meta.env.DEV ? 'Code sent. Local demo code: 123456' : `We sent a 6-digit code to ${email.trim()}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send a reset code.');
    } finally {
      setBusy(false);
    }
  }

  async function onCompleteReset(e: FormEvent) {
    e.preventDefault();
    if (!resetChallengeId) return;
    setError(null);
    setBusy(true);
    try {
      await authApi.resetPassword({ challengeId: resetChallengeId, code: resetCode.trim(), newPassword });
      setPassword(newPassword);
      setResetCode('');
      setNewPassword('');
      go('login');
      setInfo('Password changed. You can sign in now.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password reset failed.');
    } finally {
      setBusy(false);
    }
  }

  const heading = {
    login: { title: 'Welcome back', sub: 'Sign in to the SS Europa team console.' },
    otp: { title: 'Check your email', sub: 'Enter the 6-digit code we sent to confirm it’s you.' },
    forgot: { title: 'Reset your password', sub: 'Enter your work email and we’ll send you a code.' },
    reset: { title: 'Choose a new password', sub: `Enter the code sent to ${email} and a new password.` },
  }[mode];

  return (
    <div className="auth">
      <aside className="auth-hero" aria-hidden>
        <div className="auth-hero-inner">
          <Logo size={52} light subtitle="Management Console" />
          <div className="auth-hero-copy">
            <span className="auth-eyebrow">For the SS Europa team</span>
            <h2>Everything you need to help students reach Italy.</h2>
            <p>Admissions, courses, live classes and announcements — in one place.</p>
          </div>
          <ul className="auth-features">
            {FEATURES.map(({ icon: I, text }) => (
              <li key={text}>
                <span><I size={18} /></span>
                {text}
              </li>
            ))}
          </ul>
          <div className="auth-flag"><span /><span /><span /></div>
        </div>
      </aside>

      <main className="auth-panel">
        <div className="auth-card">
          <div className="auth-mobile-logo">
            <Logo size={44} />
          </div>

          <div className="auth-head">
            <h1>{heading.title}</h1>
            <p>{heading.sub}</p>
          </div>

          <div className="auth-alerts">
            {expired && <Alert tone="warn">Your session has ended. Please sign in again.</Alert>}
            {error && <Alert tone="error">{error}</Alert>}
            {info && <Alert tone="success">{info}</Alert>}
          </div>

          {mode === 'login' && (
            <form onSubmit={(e) => { e.preventDefault(); void signIn(email, password); }}>
              <div className="field">
                <label htmlFor="email">Work email</label>
                <input id="email" className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@sseuropa.com" required />
              </div>
              <div className="field">
                <div className="auth-label-row">
                  <label htmlFor="password">Password</label>
                  <button type="button" className="auth-link" onClick={() => go('forgot')}>Forgot password?</button>
                </div>
                <div className="auth-password">
                  <input
                    id="password"
                    className="input"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    required
                  />
                  <button type="button" className="auth-eye" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <Icon.EyeOff size={18} /> : <Icon.Eye size={18} />}
                  </button>
                </div>
              </div>
              <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          )}

          {mode === 'otp' && (
            <form onSubmit={onVerify}>
              {otpHint && <Alert tone="info">Local demo code: <strong>{otpHint}</strong></Alert>}
              <div className="field" style={{ marginTop: otpHint ? 14 : 0 }}>
                <label htmlFor="otp">Verification code</label>
                <input id="otp" className="input auth-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="••••••" required />
              </div>
              <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={loading}>Verify and continue</button>
              <button className="btn btn-ghost btn-block" type="button" style={{ marginTop: 8 }} onClick={() => go('login')}>
                <Icon.ArrowLeft size={16} /> Back to sign in
              </button>
            </form>
          )}

          {mode === 'forgot' && (
            <form onSubmit={onSendResetCode}>
              <div className="field">
                <label htmlFor="forgot-email">Work email</label>
                <input id="forgot-email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@sseuropa.com" required />
              </div>
              <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send reset code'}</button>
              <button className="btn btn-ghost btn-block" type="button" style={{ marginTop: 8 }} onClick={() => go('login')}>
                <Icon.ArrowLeft size={16} /> Back to sign in
              </button>
            </form>
          )}

          {mode === 'reset' && (
            <form onSubmit={onCompleteReset}>
              <div className="field">
                <label htmlFor="reset-code">6-digit code</label>
                <input id="reset-code" className="input auth-code" inputMode="numeric" maxLength={6} value={resetCode} onChange={(e) => setResetCode(e.target.value)} placeholder="••••••" required />
              </div>
              <div className="field">
                <label htmlFor="new-pass">New password</label>
                <input id="new-pass" className="input" type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 8 characters" required />
              </div>
              <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save new password'}</button>
              <button className="btn btn-ghost btn-block" type="button" style={{ marginTop: 8 }} onClick={() => go('forgot')}>
                Use a different email
              </button>
            </form>
          )}

          {import.meta.env.DEV && mode === 'login' && (
            <div className="auth-demo">
              <div className="auth-demo-title"><Icon.Sparkles size={14} /> Local development — sign in as</div>
              <div className="auth-demo-grid">
                {DEV_DEMO_ACCOUNTS.map((d) => (
                  <button
                    key={d.email}
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={loading}
                    onClick={() => {
                      setEmail(d.email);
                      setPassword(DEV_DEMO_PASSWORD);
                      void signIn(d.email, DEV_DEMO_PASSWORD);
                    }}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="auth-foot">
            <Icon.Lock size={14} /> Team accounts are created by the Super Admin. Students sign in on the student portal.
          </p>
        </div>
      </main>
    </div>
  );
}
