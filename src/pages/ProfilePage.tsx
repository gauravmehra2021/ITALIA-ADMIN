import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { Alert, Avatar, PageHeader, Spinner, formatDate, timeAgo } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { LOGIN_NOTICE_KEY } from '../services/api';
import { accountApi } from '../services/platformApi';
import { roleLabel, type User } from '../types';
import './pages.css';
import './profile.css';

/**
 * My profile — every team member manages their own account here (only while signed in):
 * name and phone, login email (confirmed with a code sent to the new address) and password.
 * Changing the email or password signs the account out everywhere, so they sign in again.
 */
export function ProfilePage() {
  const { refreshUser } = useAuth();
  const [me, setMe] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setMe(await accountApi.get());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your profile.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (loading) return <Spinner label="Loading your profile…" />;
  if (!me) return <div className="page"><Alert tone="error">{error ?? 'Could not load your profile.'}</Alert></div>;

  return (
    <div className="page">
      <PageHeader title="My profile" subtitle="Your own details, login email and password. Only you can change them here." />

      <section className="card profile-hero">
        <Avatar name={me.fullName} size="lg" />
        <div className="profile-hero-text">
          <h2>{me.fullName}</h2>
          <span className="muted">{me.email}</span>
          <div className="profile-badges">
            <span className={`badge badge-${me.role === 'SuperAdmin' ? 'gold' : 'blue'}`}>
              {me.role === 'SuperAdmin' && <Icon.ShieldCheck size={13} />} {roleLabel(me.role)}
            </span>
            {me.lastLoginAtUtc && <span className="muted small"><Icon.Clock size={13} /> Last sign-in {timeAgo(me.lastLoginAtUtc)}</span>}
            {me.createdAtUtc && <span className="muted small">Member since {formatDate(me.createdAtUtc)}</span>}
          </div>
        </div>
      </section>

      <div className="profile-grid">
        <DetailsCard me={me} onSaved={async (u) => { setMe(u); await refreshUser(); }} />
        <div className="profile-col">
          <EmailCard me={me} />
          <PasswordCard />
        </div>
      </div>
    </div>
  );
}

/** After an email or password change the server has signed this browser out: go to the login page with a note. */
function useSignOutWithNotice() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  return async (notice: string) => {
    try {
      sessionStorage.setItem(LOGIN_NOTICE_KEY, notice);
    } catch {
      /* ignore */
    }
    await logout();
    navigate('/login', { replace: true });
  };
}

// ── Name & phone ────────────────────────────────────────────────────────────

function DetailsCard({ me, onSaved }: { me: User; onSaved: (u: User) => Promise<void> }) {
  const [firstName, setFirstName] = useState(me.firstName);
  const [lastName, setLastName] = useState(me.lastName);
  const [phone, setPhone] = useState(me.phoneNumber ?? '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const dirty = firstName.trim() !== me.firstName || lastName.trim() !== me.lastName || phone.trim() !== (me.phoneNumber ?? '');

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const u = await accountApi.updateProfile({ firstName: firstName.trim(), lastName: lastName.trim(), phoneNumber: phone.trim() || null });
      await onSaved(u);
      setMsg({ tone: 'success', text: 'Your details are saved.' });
    } catch (err) {
      setMsg({ tone: 'error', text: err instanceof Error ? err.message : 'Could not save.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card profile-card">
      <div className="profile-card-head">
        <span className="stat-icon tone-blue"><Icon.Users size={18} /></span>
        <div>
          <h3>Your details</h3>
          <p className="muted small">Shown to your team and in the audit log.</p>
        </div>
      </div>
      <form onSubmit={save}>
        {msg && <div style={{ marginBottom: 12 }}><Alert tone={msg.tone}>{msg.text}</Alert></div>}
        <div className="grid-2">
          <div className="field">
            <label htmlFor="p-first">First name</label>
            <input id="p-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={60} required />
          </div>
          <div className="field">
            <label htmlFor="p-last">Last name</label>
            <input id="p-last" value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={60} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="p-phone">Phone / WhatsApp <span className="muted">(optional)</span></label>
          <input id="p-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+39 333 123 4567" />
        </div>
        <div className="field">
          <label htmlFor="p-email-ro">Login email</label>
          <input id="p-email-ro" value={me.email} readOnly disabled />
          <span className="hint">Change it in “Login email”, so the new address can be confirmed first.</span>
        </div>
        <div className="profile-actions">
          <button type="submit" className="btn btn-primary" disabled={saving || !dirty}>{saving ? 'Saving…' : 'Save details'}</button>
        </div>
      </form>
    </section>
  );
}

// ── Login email (two steps: password → code sent to the new address) ─────────

function EmailCard({ me }: { me: User }) {
  const signOut = useSignOutWithNotice();
  const [open, setOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [challenge, setChallenge] = useState<{ challengeId: string; newEmail: string } | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  function reset() {
    setOpen(false);
    setNewEmail('');
    setPassword('');
    setChallenge(null);
    setCode('');
    setError(null);
  }

  async function sendCode(e?: FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await accountApi.requestEmailChange(newEmail.trim(), password);
      setChallenge(res);
      setCode('');
      setResendIn(60);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the code.');
    } finally {
      setBusy(false);
    }
  }

  async function confirm(e: FormEvent) {
    e.preventDefault();
    if (!challenge) return;
    setBusy(true);
    setError(null);
    try {
      await accountApi.confirmEmailChange(challenge.challengeId, code.trim());
      await signOut(`Your login email is now ${challenge.newEmail}. Please sign in with it.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change the email.');
      setBusy(false);
    }
  }

  return (
    <section className="card profile-card">
      <div className="profile-card-head">
        <span className="stat-icon tone-purple"><Icon.Mail size={18} /></span>
        <div>
          <h3>Login email</h3>
          <p className="muted small">You sign in with <strong>{me.email}</strong>.</p>
        </div>
        {!open && <button type="button" className="btn btn-secondary btn-sm profile-head-btn" onClick={() => setOpen(true)}><Icon.Edit size={15} /> Change</button>}
      </div>

      {open && !challenge && (
        <form onSubmit={sendCode}>
          {error && <div style={{ marginBottom: 12 }}><Alert tone="error">{error}</Alert></div>}
          <div className="field">
            <label htmlFor="p-new-email">New login email</label>
            <input id="p-new-email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="name@example.com" required autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="p-email-pass">Your current password</label>
            <input id="p-email-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
            <span className="hint">We send a 6-digit code to the new address to make sure it’s yours and spelled right.</span>
          </div>
          <div className="profile-actions">
            <button type="button" className="btn btn-ghost" onClick={reset} disabled={busy}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy || !newEmail.trim() || !password}><Icon.Send size={15} /> {busy ? 'Sending…' : 'Send code'}</button>
          </div>
        </form>
      )}

      {open && challenge && (
        <form onSubmit={confirm}>
          <Alert tone="info">We sent a 6-digit code to <strong>{challenge.newEmail}</strong>. Check the inbox and the spam folder. It is valid for 10 minutes.</Alert>
          {error && <div style={{ marginTop: 12 }}><Alert tone="error">{error}</Alert></div>}
          <div className="field" style={{ marginTop: 14 }}>
            <label htmlFor="p-code">6-digit code</label>
            <input
              id="p-code"
              className="profile-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="••••••"
              required
              autoFocus
            />
          </div>
          <Alert tone="warn">After the change you are signed out everywhere and sign in again with the new email. Your password stays the same.</Alert>
          <div className="profile-actions">
            <button type="button" className="btn btn-ghost" onClick={reset} disabled={busy}>Cancel</button>
            <button type="button" className="btn btn-ghost" onClick={() => void sendCode()} disabled={busy || resendIn > 0}>
              {resendIn > 0 ? `Send again in ${resendIn}s` : 'Send code again'}
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy || code.length !== 6}>{busy ? 'Checking…' : 'Confirm new email'}</button>
          </div>
        </form>
      )}
    </section>
  );
}

// ── Password ────────────────────────────────────────────────────────────────

function PasswordCard() {
  const signOut = useSignOutWithNotice();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rules = [
    { ok: next.length >= 8, text: 'At least 8 characters' },
    { ok: /[A-Za-z]/.test(next) && /\d/.test(next), text: 'Letters and at least one number' },
    { ok: next.length > 0 && next !== current, text: 'Different from your current password' },
    { ok: next.length > 0 && next === repeat, text: 'Both new passwords match' },
  ];
  const valid = current.length > 0 && rules.every((r) => r.ok);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      await accountApi.changePassword(current, next);
      await signOut('Your password was changed. Please sign in with your new password.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change the password.');
      setBusy(false);
    }
  }

  const type = show ? 'text' : 'password';
  return (
    <section className="card profile-card">
      <div className="profile-card-head">
        <span className="stat-icon tone-green"><Icon.Key size={18} /></span>
        <div>
          <h3>Password</h3>
          <p className="muted small">Changing it signs you out on every device, this one included.</p>
        </div>
        <button type="button" className="icon-btn profile-head-btn" onClick={() => setShow((v) => !v)} title={show ? 'Hide passwords' : 'Show passwords'} aria-label={show ? 'Hide passwords' : 'Show passwords'}>
          {show ? <Icon.EyeOff size={17} /> : <Icon.Eye size={17} />}
        </button>
      </div>
      <form onSubmit={save}>
        {error && <div style={{ marginBottom: 12 }}><Alert tone="error">{error}</Alert></div>}
        <div className="field">
          <label htmlFor="p-cur">Current password</label>
          <input id="p-cur" type={type} value={current} onChange={(e) => setCurrent(e.target.value)} required autoComplete="current-password" />
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="p-new">New password</label>
            <input id="p-new" type={type} value={next} onChange={(e) => setNext(e.target.value)} required autoComplete="new-password" />
          </div>
          <div className="field">
            <label htmlFor="p-rep">Repeat new password</label>
            <input id="p-rep" type={type} value={repeat} onChange={(e) => setRepeat(e.target.value)} required autoComplete="new-password" />
          </div>
        </div>
        <ul className="profile-rules" aria-label="Password rules">
          {rules.map((r) => (
            <li key={r.text} className={r.ok ? 'ok' : ''}>
              {r.ok ? <Icon.CheckCircle size={14} /> : <Icon.Info size={14} />} {r.text}
            </li>
          ))}
        </ul>
        <div className="profile-actions">
          <button type="submit" className="btn btn-primary" disabled={busy || !valid}>{busy ? 'Saving…' : 'Change password'}</button>
        </div>
      </form>
    </section>
  );
}
