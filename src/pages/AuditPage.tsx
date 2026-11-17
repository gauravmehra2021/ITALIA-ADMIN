import { useEffect, useMemo, useState } from 'react';
import { Icon, type IconName } from '../components/Icons';
import { Alert, Avatar, EmptyState, PageHeader, Spinner, type Tone } from '../components/ui';
import { auditApi, usersApi } from '../services/platformApi';
import type { AuditLog, User } from '../types';
import './pages.css';

/* Plain-English names for the events the server records. */
const EVENTS: Record<string, { label: string; icon: IconName; tone: Tone; group: Group }> = {
  login_success: { label: 'Signed in', icon: 'Login', tone: 'green', group: 'access' },
  logout: { label: 'Signed out', icon: 'Logout', tone: 'gray', group: 'access' },
  terminate_session: { label: 'Session ended', icon: 'Logout', tone: 'gray', group: 'access' },
  mobile_login_otp_issued: { label: 'Login code sent', icon: 'Key', tone: 'blue', group: 'access' },
  forgot_password_otp_issued: { label: 'Password reset requested', icon: 'Key', tone: 'orange', group: 'access' },
  password_reset_success: { label: 'Password changed', icon: 'Lock', tone: 'orange', group: 'access' },
  register: { label: 'Account created', icon: 'UserPlus', tone: 'purple', group: 'accounts' },
  mobile_register: { label: 'Student signed up (app)', icon: 'UserPlus', tone: 'purple', group: 'accounts' },
  submit_enquiry: { label: 'New website enquiry', icon: 'Inbox', tone: 'blue', group: 'activity' },
  update_enquiry_status: { label: 'Lead updated', icon: 'Edit', tone: 'teal', group: 'activity' },
  dispatch_notification: { label: 'Notification sent', icon: 'Megaphone', tone: 'teal', group: 'activity' },
  class_start_alert: { label: 'Class reminder sent', icon: 'Bell', tone: 'teal', group: 'activity' },
  seed: { label: 'Demo data loaded', icon: 'Sparkles', tone: 'gray', group: 'activity' },
};

type Group = 'access' | 'accounts' | 'activity';
type Filter = 'all' | Group;

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Everything' },
  { id: 'access', label: 'Sign-ins & security' },
  { id: 'accounts', label: 'Accounts' },
  { id: 'activity', label: 'Team activity' },
];

const humanize = (s: string) => s.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
const eventOf = (a: AuditLog) => EVENTS[a.action] ?? { label: humanize(a.action), icon: 'Activity' as IconName, tone: 'gray' as Tone, group: 'activity' as Group };

/** "Mozilla/5.0 (Windows NT 10.0; …) Chrome/…" → "Chrome on Windows". */
function describeDevice(ua: string) {
  // The server keeps only the first ~80 characters, so the browser name is often cut off.
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Version\/.*Safari\//.test(ua) ? 'Safari' : /okhttp|Expo|ReactNative|Dart/i.test(ua) ? 'Mobile app' : '';
  const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad|iOS/.test(ua) ? 'iPhone' : /Mac OS X|Macintosh/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : '';
  const kind = /Android|iPhone|iPad|iOS/.test(ua) ? 'phone' : 'computer';
  const where = /Student web/.test(ua) ? ' · student portal' : '';
  if (browser && os) return `${browser} on ${os}${where}`;
  if (os) return `${os} ${kind}${where}`;
  return `${browser || 'Unknown device'}${where}`;
}

/** "Authenticated login for a@b.com (SuperAdmin)" → "a@b.com". */
function tidyDetails(details: string) {
  const m = /^Authenticated login for (\S+)/.exec(details);
  return m ? m[1] : details;
}

type Row = AuditLog & { device?: string };

/** The server writes two rows per sign-in (who + which device); show them as one. */
function mergeRows(list: AuditLog[]): Row[] {
  const sorted = [...list].sort((a, b) => +new Date(b.createdAtUtc) - +new Date(a.createdAtUtc));
  const out: Row[] = [];
  for (const a of sorted) {
    if (a.action === 'login_success' && a.details.startsWith('Device ')) {
      const t = +new Date(a.createdAtUtc);
      const twin = out.find((r) => r.action === 'login_success' && !r.device && r.actorUserId === a.actorUserId && Math.abs(+new Date(r.createdAtUtc) - t) < 5000);
      if (twin) {
        twin.device = describeDevice(a.details.slice(7));
        continue;
      }
      out.push({ ...a, details: 'Signed in', device: describeDevice(a.details.slice(7)) });
      continue;
    }
    out.push({ ...a });
  }
  return out;
}

const PAGE = 50;

export function AuditPage() {
  const [items, setItems] = useState<AuditLog[]>([]);
  const [people, setPeople] = useState<Map<string, User>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(PAGE);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [logs, users] = await Promise.all([auditApi.list(), usersApi.list().catch(() => [] as User[])]);
      setItems(logs);
      setPeople(new Map(users.map((u) => [u.id, u])));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the audit log.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const rows = useMemo(() => mergeRows(items), [items]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== 'all' && eventOf(r).group !== filter) return false;
      if (!q) return true;
      const who = r.actorUserId ? people.get(r.actorUserId) : undefined;
      return [eventOf(r).label, r.details, r.resource, who?.fullName, who?.email, r.device].some((v) => v?.toLowerCase().includes(q));
    });
  }, [rows, filter, search, people]);

  const groups = useMemo(() => {
    const map = new Map<string, Row[]>();
    visible.slice(0, limit).forEach((r) => {
      const key = new Date(r.createdAtUtc).toDateString();
      map.set(key, [...(map.get(key) ?? []), r]);
    });
    return [...map.entries()];
  }, [visible, limit]);

  const dayLabel = (key: string) => {
    if (key === new Date().toDateString()) return 'Today';
    if (key === new Date(Date.now() - 86400000).toDateString()) return 'Yesterday';
    return new Date(key).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const today = rows.filter((r) => new Date(r.createdAtUtc).toDateString() === new Date().toDateString());

  return (
    <div className="page">
      <PageHeader
        title="Audit Log"
        subtitle="A permanent record of sign-ins and important changes, so you can always see who did what and when."
        actions={
          <button type="button" className="btn btn-secondary" onClick={() => void load()} disabled={loading}>
            <Icon.Refresh size={17} /> Refresh
          </button>
        }
      />

      {error && <Alert tone="error">{error}</Alert>}

      <div className="stats">
        <div className="stat-card tone-blue"><span className="stat-icon"><Icon.Activity size={21} /></span><span className="stat-body"><span className="stat-value">{today.length}</span><span className="stat-label">Events today</span></span></div>
        <div className="stat-card tone-green"><span className="stat-icon"><Icon.Login size={21} /></span><span className="stat-body"><span className="stat-value">{today.filter((r) => r.action === 'login_success').length}</span><span className="stat-label">Sign-ins today</span></span></div>
        <div className="stat-card tone-orange"><span className="stat-icon"><Icon.Key size={21} /></span><span className="stat-body"><span className="stat-value">{rows.filter((r) => r.action.includes('password')).length}</span><span className="stat-label">Password resets</span></span></div>
        <div className="stat-card tone-purple"><span className="stat-icon"><Icon.Layers size={21} /></span><span className="stat-body"><span className="stat-value">{rows.length}</span><span className="stat-label">Events recorded</span></span></div>
      </div>

      <section className="card">
        <div className="card-head toolbar">
          <div className="chips">
            {FILTERS.map((f) => (
              <button key={f.id} type="button" className={`chip ${filter === f.id ? 'active' : ''}`} onClick={() => { setFilter(f.id); setLimit(PAGE); }}>
                {f.label}
              </button>
            ))}
          </div>
          <label className="search">
            <Icon.Search size={17} />
            <input className="input" type="search" placeholder="Search person, event, details…" value={search} onChange={(e) => { setSearch(e.target.value); setLimit(PAGE); }} />
          </label>
        </div>

        {loading ? (
          <Spinner label="Loading events…" />
        ) : visible.length === 0 ? (
          <EmptyState icon="ShieldCheck" title="No events found" text="Try another filter or search word." />
        ) : (
          <div className="timeline">
            {groups.map(([day, list]) => (
              <div key={day}>
                <div className="agenda-date">{dayLabel(day)}</div>
                <ul>
                  {list.map((r) => {
                    const ev = eventOf(r);
                    const I = Icon[ev.icon];
                    const who = r.actorUserId ? people.get(r.actorUserId) : undefined;
                    return (
                      <li key={r.id} className="event">
                        <span className={`event-icon tone-${ev.tone}`}><I size={16} /></span>
                        <div className="event-main">
                          <div className="event-top">
                            <strong>{ev.label}</strong>
                            {who ? (
                              <span className="event-who"><Avatar name={who.fullName} size="sm" /> {who.fullName}</span>
                            ) : (
                              <span className="muted small">{r.actorUserId ? 'Unknown account' : 'System / visitor'}</span>
                            )}
                          </div>
                          <div className="event-details">
                            {r.details && r.details !== 'Signed in' && <span>{tidyDetails(r.details)}</span>}
                            {r.device && <span className="muted"><Icon.Globe size={13} /> {r.device}</span>}
                          </div>
                        </div>
                        <time className="event-time" dateTime={r.createdAtUtc} title={new Date(r.createdAtUtc).toLocaleString()}>
                          {new Date(r.createdAtUtc).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </time>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            {visible.length > limit && (
              <div className="row-end" style={{ justifyContent: 'center', padding: '8px 0 4px' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setLimit((l) => l + PAGE)}>
                  Show older events ({visible.length - limit} more)
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
