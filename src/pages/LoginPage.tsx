import type { FormEvent } from 'react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ErrorBox, SuccessBox } from '../components/StateBlock';
import { useAuth } from '../hooks/useAuth';
import { authApi } from '../services/platformApi';
import './login.css';

export function LoginPage() {
  const { loginWithPassword, verifyOtp, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [otpHint, setOtpHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isForgot, setIsForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetChallengeId, setResetChallengeId] = useState<string | null>(null);
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);

  async function onSendResetCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setResetSubmitting(true);
    try {
      const res = await authApi.forgotPassword(forgotEmail);
      setResetChallengeId(res.challengeId);
      setInfo('Verification code sent. For demonstration, use code: 123456');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not request reset code.');
    } finally {
      setResetSubmitting(false);
    }
  }

  async function onCompleteReset(e: FormEvent) {
    e.preventDefault();
    if (!resetChallengeId) return;
    setError(null);
    setInfo(null);
    setResetSubmitting(true);
    try {
      await authApi.resetPassword({
        challengeId: resetChallengeId,
        code: resetCode,
        newPassword,
      });
      setInfo('Password reset successfully. You can now sign in with your new password.');
      setIsForgot(false);
      setResetChallengeId(null);
      setPassword(newPassword);
      setEmail(forgotEmail);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password reset failed.');
    } finally {
      setResetSubmitting(false);
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
        setInfo('OTP required. Please enter the verification code.');
        return;
      }
      navigate('/app');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please check your credentials.');
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
            🛡️ <strong>Admin Portal:</strong> Use the quick buttons below or enter your admin credentials.
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '6px 12px', flex: '1 1 auto' }}
              onClick={() => {
                setEmail('superadmin@sseuropa.demo');
                setPassword('Demo@12345');
              }}
            >
              👑 SuperAdmin
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '6px 12px', flex: '1 1 auto' }}
              onClick={() => {
                setEmail('admin@sseuropa.demo');
                setPassword('Demo@12345');
              }}
            >
              🛡️ Admin (Demo)
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '6px 12px', flex: '1 1 auto' }}
              onClick={() => {
                setEmail('admin@sseuropa.com');
                setPassword('Admin@SSEuropa2026!');
              }}
            >
              🏢 Root Admin
            </button>
          </div>

          {error && <ErrorBox message={error} />}
          {info && <SuccessBox message={info} />}



          {isForgot ? (
            !resetChallengeId ? (
              <form onSubmit={onSendResetCode}>
                <div style={{ marginBottom: '12px', fontSize: '0.9rem', color: 'var(--muted)' }}>
                  Enter your registered email address and we'll send a 6-digit verification code to reset your password.
                </div>
                <div className="field">
                  <label htmlFor="forgot-email">Account Email</label>
                  <input
                    id="forgot-email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    type="email"
                    placeholder="you@sseuropa.demo"
                  />
                </div>
                <button className="btn btn-primary" type="submit" disabled={resetSubmitting} style={{ width: '100%', marginBottom: '8px' }}>
                  {resetSubmitting ? 'Sending code…' : 'Send reset code'}
                </button>
                <button
                  className="btn btn-secondary"
                  type="button"
                  style={{ width: '100%' }}
                  onClick={() => { setIsForgot(false); setError(null); setInfo(null); }}
                >
                  Back to login
                </button>
              </form>
            ) : (
              <form onSubmit={onCompleteReset}>
                <div style={{ marginBottom: '12px', fontSize: '0.9rem', color: 'var(--muted)' }}>
                  Enter the 6-digit code sent to {forgotEmail} and choose your new password.
                </div>
                <div className="field">
                  <label htmlFor="reset-code">6-Digit Code</label>
                  <input
                    id="reset-code"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    required
                    placeholder="123456"
                    maxLength={6}
                  />
                </div>
                <div className="field">
                  <label htmlFor="new-pass">New Password</label>
                  <input
                    id="new-pass"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    type="password"
                    placeholder="Enter new strong password"
                  />
                </div>
                <button className="btn btn-primary" type="submit" disabled={resetSubmitting} style={{ width: '100%', marginBottom: '8px' }}>
                  {resetSubmitting ? 'Resetting password…' : 'Save new password'}
                </button>
                <button
                  className="btn btn-secondary"
                  type="button"
                  style={{ width: '100%' }}
                  onClick={() => { setResetChallengeId(null); setError(null); }}
                >
                  Change email
                </button>
              </form>
            )
          ) : !pendingUserId ? (
            <form onSubmit={onPasswordLogin}>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input id="email" value={email} onChange={(e) => setEmail(e.target.value)} required type="email" />
              </div>
              <div className="field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label htmlFor="password">Password</label>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: 'var(--azure, #0077b6)', cursor: 'pointer', fontSize: '0.8rem', padding: 0 }}
                    onClick={() => { setIsForgot(true); setForgotEmail(email); setError(null); setInfo(null); }}
                  >
                    Forgot password?
                  </button>
                </div>
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
