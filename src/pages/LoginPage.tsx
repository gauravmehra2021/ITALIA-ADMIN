import type { FormEvent } from 'react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ErrorBox, SuccessBox } from '../components/StateBlock';
import { useAuth } from '../hooks/useAuth';
import './login.css';

const DEMO_ACCOUNTS = [
  { email: 'mentor@sseuropa.demo', role: 'Teacher (Mentor)', note: 'Courses, lessons & live class alerts' },
  { email: 'staff@sseuropa.demo', role: 'Staff (Admissions)', note: 'Website enquiries & lead conversion' },
  { email: 'admin@sseuropa.demo', role: 'Admin', note: 'Curriculum, teachers & student overview' },
  { email: 'superadmin@sseuropa.demo', role: 'Super Admin', note: 'Platform governance & notifications' },
];

export function LoginPage() {
  const { demoLogin, loginWithPassword, verifyOtp, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('mentor@sseuropa.demo');
  const [password, setPassword] = useState('Demo@12345');
  const [otp, setOtp] = useState('');
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [otpHint, setOtpHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onDemo(selected?: string) {
    setError(null);
    setInfo(null);
    try {
      await demoLogin(selected ?? email);
      setInfo('Signed in with demonstration-only authentication.');
      navigate('/app');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Demo login failed');
    }
  }

  async function onPasswordLogin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    try {
      const result = await loginWithPassword(email, password);
      if (result.requiresOtp && result.pendingUserId) {
        setPendingUserId(result.pendingUserId);
        setOtpHint(result.demoOtpHint ?? null);
        setInfo('OTP required. Use the demonstration OTP shown below.');
        return;
      }
      navigate('/app');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  }

  async function onVerify(e: FormEvent) {
    e.preventDefault();
    if (!pendingUserId) return;
    setError(null);
    try {
      await verifyOtp(pendingUserId, otp);
      navigate('/app');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OTP verification failed');
    }
  }

  return (
    <div className="login-page">
      <div className="login-stage" aria-hidden>
        <div className="login-photo" />
        <div className="login-veil" />
      </div>

      <div className="login-shell animate-rise">
        <Link to="/" className="brand login-brand">SS Europa</Link>
        <p className="login-subtitle">Secure learning workspace</p>

        <div className="login-panel">
          <h1>Sign in</h1>
          <p className="login-note">
            Teacher, Staff & Administrator Management Portal
          </p>

          <div style={{ background: 'rgba(13, 92, 117, 0.1)', border: '1px solid rgba(13, 92, 117, 0.3)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '0.85rem', color: 'var(--text)' }}>
            📱 <strong>Student Access:</strong> Students log in and take courses via the <strong>SS Europa React Native Mobile App</strong>. This portal is for Teachers, Admissions Staff, and Admins.
          </div>

          {error && <ErrorBox message={error} />}
          {info && <SuccessBox message={info} />}

          <div className="demo-grid">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.email}
                type="button"
                className="demo-tile"
                disabled={loading}
                onClick={() => void onDemo(a.email)}
              >
                <strong>{a.role}</strong>
                <span>{a.note}</span>
              </button>
            ))}
          </div>

          <div className="login-divider"><span>or continue with OTP</span></div>

          {!pendingUserId ? (
            <form onSubmit={onPasswordLogin}>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input id="email" value={email} onChange={(e) => setEmail(e.target.value)} required type="email" />
              </div>
              <div className="field">
                <label htmlFor="password">Password</label>
                <input id="password" value={password} onChange={(e) => setPassword(e.target.value)} required type="password" />
              </div>
              <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
                Continue with OTP
              </button>
            </form>
          ) : (
            <form onSubmit={onVerify}>
              {otpHint && <SuccessBox message={`Demonstration OTP: ${otpHint}`} />}
              <div className="field">
                <label htmlFor="otp">OTP code</label>
                <input id="otp" value={otp} onChange={(e) => setOtp(e.target.value)} required />
              </div>
              <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
                Verify OTP
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
