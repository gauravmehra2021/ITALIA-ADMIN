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

/** `ids` = every stored entry this row stands for (a sign-in is two entries). */
type Row = AuditLog & { device?: string; ids: string[] };

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
        twin.ids.push(a.id);
        continue;
      }
      out.push({ ...a, details: 'Signed in', device: describeDevice(a.details.slice(7)), ids: [a.id] });
      continue;
    }
    out.push({ ...a, ids: [a.id] });
  }
  return out;
}

const PAGE = 50;

const MONTHS = Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1).toLocaleDateString(undefined, { month: 'long' }));
const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: THIS_YEAR - 2024 + 1 }, (_, i) => THIS_YEAR - i);

/** Year / month / day the Super Admin picked; '' = any. Month is 0–11. */
type Period = { year: string; month: string; day: string };

/** Local-time period → [from, to) in UTC, or null for "all time". */
function periodRange(p: Period): { fromUtc: string; toUtc: string } | null {
  if (!p.year) return null;
  const y = +p.year;
  let from: Date, to: Date;
  if (p.month === '') {
    from = new Date(y, 0, 1);
    to = new Date(y + 1, 0, 1);
  } else if (p.day === '') {
    from = new Date(y, +p.month, 1);
    to = new Date(y, +p.month + 1, 1);
  } else {
    from = new Date(y, +p.month, +p.day);
    to = new Date(y, +p.month, +p.day + 1);
  }
  return { fromUtc: from.toISOString(), toUtc: to.toISOString() };
}

function periodLabel(p: Period) {
  if (!p.year) return 'all time';
  if (p.month === '') return p.year;
  if (p.day === '') return `${MONTHS[+p.month]} ${p.year}`;
  return new Date(+p.year, +p.month, +p.day).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

export function AuditPage() {
  const [items, setItems] = useState<AuditLog[]>([]);
  const [people, setPeople] = useState<Map<string, User>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [period, setPeriod] = useState<Period>({ year: '', month: '', day: '' });
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function load(p: Period = period) {
    setLoading(true);
    setError(null);
    try {
      const [logs, users] = await Promise.all([auditApi.list(periodRange(p) ?? undefined), usersApi.list().catch(() => [] as User[])]);
      setItems(logs);
      setPeople(new Map(users.map((u) => [u.id, u])));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the audit log.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(period);
    setLimit(PAGE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const changePeriod = (next: Partial<Period>) => setPeriod((p) => {
    const merged = { ...p, ...next };
    if (!merged.year) return { year: '', month: '', day: '' };
    if (merged.month === '') return { ...merged, day: '' };
    const days = new Date(+merged.year, +merged.month + 1, 0).getDate();
    return +merged.day > days ? { ...merged, day: '' } : merged;
  });

  const daysInMonth = period.year && period.month !== '' ? new Date(+period.year, +period.month + 1, 0).getDate() : 0;
  const filtered = filter !== 'all' || search.trim() !== '';

  async function removeRow(r: Row) {
    if (!confirm(`Delete this log entry ("${eventOf(r).label}")? This can't be undone.`)) return;
    await runDelete({ ids: r.ids });
  }

  /** Filters on → delete exactly what's shown. No filters → delete the whole period on the server. */
  async function removeShown() {
    const label = periodLabel(period);
    if (filtered) {
      const ids = visible.flatMap((r) => r.ids);
      if (!confirm(`Delete the ${visible.length} log entries shown (${label}, current filter)? This can't be undone.`)) return;
      await runDelete({ ids });
      return;
    }
    const range = periodRange(period);
    if (!range) {
      const typed = prompt('This deletes EVERY audit log entry, from all time. Type DELETE to confirm.');
      if (typed?.trim().toUpperCase() !== 'DELETE') return;
      await runDelete({ all: true });
      return;
    }
    if (!confirm(`Delete all audit logs from ${label}? This can't be undone.`)) return;
    await runDelete(range);
  }

  async function runDelete(body: Parameters<typeof auditApi.remove>[0]) {
    setDeleting(true);
    setError(null);
    setNotice(null);
    try {
      const res = await auditApi.remove(body);
      setNotice(`${res.deleted} log ${res.deleted === 1 ? 'entry' : 'entries'} deleted.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete the logs.');
    } finally {
      setDeleting(false);
    }
  }

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

  const pLabel = periodLabel(period);
  const people_ = new Set(rows.map((r) => r.actorUserId).filter(Boolean)).size;

  return (
    <div className="page">
      <PageHeader
        title="Audit Log"
        subtitle="A record of sign-ins and important changes, so you can see who did what and when. Filter by year, month or day, and delete old entries you no longer need."
        actions={
          <button type="button" className="btn btn-secondary" onClick={() => void load()} disabled={loading}>
            <Icon.Refresh size={17} /> Refresh
          </button>
        }
      />

      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success" onClose={() => setNotice(null)}>{notice}</Alert>}

      <div className="stats">
        <div className="stat-card tone-blue"><span className="stat-icon"><Icon.Activity size={21} /></span><span className="stat-body"><span className="stat-value">{rows.length}</span><span className="stat-label">Events · {pLabel}</span></span></div>
        <div className="stat-card tone-green"><span className="stat-icon"><Icon.Login size={21} /></span><span className="stat-body"><span className="stat-value">{rows.filter((r) => r.action === 'login_success').length}</span><span className="stat-label">Sign-ins</span></span></div>
        <div className="stat-card tone-orange"><span className="stat-icon"><Icon.Key size={21} /></span><span className="stat-body"><span className="stat-value">{rows.filter((r) => r.action.includes('password')).length}</span><span className="stat-label">Password resets</span></span></div>
        <div className="stat-card tone-purple"><span className="stat-icon"><Icon.Users size={21} /></span><span className="stat-body"><span className="stat-value">{people_}</span><span className="stat-label">People active</span></span></div>
      </div>

      <section className="card">
        <div className="card-head toolbar audit-period">
          <div className="audit-period-picks">
            <Icon.Calendar size={17} />
            <select className="select input-sm" aria-label="Year" value={period.year} onChange={(e) => changePeriod({ year: e.target.value })}>
              <option value="">All years</option>
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <select className="select input-sm" aria-label="Month" value={period.month} disabled={!period.year} onChange={(e) => changePeriod({ month: e.target.value })}>
              <option value="">All months</option>
              {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
            <select className="select input-sm" aria-label="Day" value={period.day} disabled={!daysInMonth} onChange={(e) => changePeriod({ day: e.target.value })}>
              <option value="">All days</option>
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            {period.year && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => changePeriod({ year: '' })}>
                <Icon.X size={15} /> Clear
              </button>
            )}
          </div>
          <button type="button" className="btn btn-danger btn-sm" disabled={deleting || loading || visible.length === 0} onClick={() => void removeShown()}>
            <Icon.Trash size={15} /> {deleting ? 'Deleting…' : filtered ? `Delete ${visible.length} shown` : `Delete logs · ${pLabel}`}
          </button>
        </div>
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
          <EmptyState icon="ShieldCheck" title="No events found" text={`Nothing recorded for ${pLabel} with this filter. Try another period, filter or search word.`} />
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
                        <span className="event-end">
                          <time className="event-time" dateTime={r.createdAtUtc} title={new Date(r.createdAtUtc).toLocaleString()}>
                            {new Date(r.createdAtUtc).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                          </time>
                          <button type="button" className="btn btn-danger-soft btn-sm event-delete" title="Delete this entry" aria-label="Delete this entry" disabled={deleting} onClick={() => void removeRow(r)}>
                            <Icon.Trash size={14} />
                          </button>
                        </span>
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
