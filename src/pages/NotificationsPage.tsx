import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Icon, type IconName } from '../components/Icons';
import { Alert, EmptyState, Logo, PageHeader, Spinner, timeAgo } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { notificationsApi, usersApi } from '../services/platformApi';
import { roleLabel, type NotificationItem, type User } from '../types';
import './pages.css';

/* Server enums: UserRole User=0 Mentor=1 Admin=2 SuperAdmin=3 Staff=4;
   NotificationType Class=0 Payment=1 Test=2 Announcement=3 Security=4 System=5. */

type Audience = 'students' | 'teachers' | 'staff' | 'admins' | 'everyone' | 'person';

const AUDIENCES: { id: Audience; label: string; help: string; icon: IconName; role: number | null }[] = [
  { id: 'students', label: 'All students', help: 'Everyone learning on the app and web', icon: 'Cap', role: 0 },
  { id: 'teachers', label: 'Teachers', help: 'All teacher accounts', icon: 'Book', role: 1 },
  { id: 'staff', label: 'Admissions staff', help: 'All staff accounts', icon: 'Inbox', role: 4 },
  { id: 'admins', label: 'Admins', help: 'All admin accounts', icon: 'Shield', role: 2 },
  { id: 'everyone', label: 'Everyone', help: 'Every account you can reach', icon: 'Globe', role: null },
  { id: 'person', label: 'One person', help: 'Pick a single account', icon: 'Users', role: null },
];

const CATEGORIES: { type: number; label: string; icon: IconName }[] = [
  { type: 3, label: 'Announcement', icon: 'Megaphone' },
  { type: 0, label: 'Class', icon: 'Video' },
  { type: 2, label: 'Test / exam', icon: 'File' },
  { type: 4, label: 'Account', icon: 'Lock' },
];

const TYPE_NAMES = ['Class', 'Payment', 'Test', 'Announcement', 'Security', 'System'];
const typeName = (t: NotificationItem['type']) => (typeof t === 'string' ? t : TYPE_NAMES[t] ?? 'System');
const TYPE_ICON: Record<string, IconName> = { Class: 'Video', Test: 'File', Announcement: 'Megaphone', Security: 'Lock', Payment: 'Info', System: 'Info' };

const TITLE_MAX = 80;

/** The server describes audiences with internal role names ("All User accounts"). */
function friendlyTarget(desc: string) {
  const names: Record<string, string> = { User: 'all students', Mentor: 'all teachers', Staff: 'all admissions staff', Admin: 'all admins' };
  const m = /^All (\w+) accounts$/.exec(desc);
  if (m && names[m[1]]) return names[m[1]];
  return desc.replace(/\((User|Mentor|SuperAdmin|Admin|Staff)\)/, (_, r: string) => `(${roleLabel(r)})`).replace(/^./, (c) => c.toLowerCase());
}

export function NotificationsPage() {
  const { user, hasRole, can } = useAuth();
  const canSend = can('notifications', 'Full');
  const isSuperAdmin = hasRole('SuperAdmin');
  const isAdmin = hasRole('Admin');

  const allowed = AUDIENCES.filter((a) => {
    if (a.id === 'students') return true;
    if (a.id === 'teachers' || a.id === 'staff' || a.id === 'everyone') return isAdmin || isSuperAdmin;
    if (a.id === 'admins' || a.id === 'person') return isSuperAdmin; // picking a person needs the user list (Super Admin only)
    return false;
  });

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [people, setPeople] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [audience, setAudience] = useState<Audience>('students');
  const [personId, setPersonId] = useState('');
  const [category, setCategory] = useState(3);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [inboxFilter, setInboxFilter] = useState<'all' | 'unread'>('all');

  async function load() {
    try {
      const list = await notificationsApi.list();
      setItems(list.sort((a, b) => +new Date(b.createdAtUtc) - +new Date(a.createdAtUtc)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load notifications.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    if (isSuperAdmin) {
      usersApi.list().then((u) => setPeople(u.filter((x) => !x.isDeleted && x.id !== user?.id))).catch(() => setPeople([]));
    }
  }, [isSuperAdmin, user?.id]);

  async function send(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    setToast(null);
    const a = AUDIENCES.find((x) => x.id === audience)!;
    try {
      const res = await notificationsApi.send({
        title: title.trim(),
        message: message.trim(),
        type: category,
        targetRole: audience === 'person' ? null : a.role,
        targetUserId: audience === 'person' ? personId : null,
      });
      setToast(`Sent to ${res.sentCount} ${res.sentCount === 1 ? 'person' : 'people'} — ${friendlyTarget(res.targetDescription)}.`);
      setTitle('');
      setMessage('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the notification.');
    } finally {
      setSending(false);
    }
  }

  async function markRead(id: string) {
    setItems((list) => list.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    try {
      await notificationsApi.markRead(id);
    } catch {
      void load();
    }
  }

  async function markAllRead() {
    const unread = items.filter((n) => !n.isRead);
    setItems((list) => list.map((n) => ({ ...n, isRead: true })));
    await Promise.allSettled(unread.map((n) => notificationsApi.markRead(n.id)));
  }

  const unreadCount = items.filter((n) => !n.isRead).length;
  const inbox = useMemo(() => items.filter((n) => inboxFilter === 'all' || !n.isRead), [items, inboxFilter]);
  const cat = CATEGORIES.find((c) => c.type === category)!;
  const CatIcon = Icon[cat.icon];

  return (
    <div className="page">
      <PageHeader
        title="Notifications"
        subtitle="Send announcements and reminders. They appear in the student app and portal straight away."
      />

      {toast && <Alert tone="success" onClose={() => setToast(null)}>{toast}</Alert>}
      {error && <Alert tone="error" onClose={() => setError(null)}>{error}</Alert>}

      <div className="notify-grid">
        <form className="card" onSubmit={send}>
          <div className="card-head">
            <div>
              <h2>New notification</h2>
              <p>Short and clear works best — students read these on their phones.</p>
            </div>
          </div>
          <div className="card-body">
            <div className="label" style={{ marginBottom: 8 }}>Who should receive it?</div>
            <div className="audience-grid" role="radiogroup" aria-label="Audience">
              {allowed.map((a) => {
                const I = Icon[a.icon];
                return (
                  <button
                    key={a.id}
                    type="button"
                    role="radio"
                    aria-checked={audience === a.id}
                    className={`audience ${audience === a.id ? 'active' : ''}`}
                    onClick={() => setAudience(a.id)}
                  >
                    <I size={18} />
                    <span>
                      <strong>{a.label}</strong>
                      <small>{a.help}</small>
                    </span>
                  </button>
                );
              })}
            </div>

            {audience === 'person' && (
              <div className="field" style={{ marginTop: 14 }}>
                <label htmlFor="n-person">Person</label>
                <select id="n-person" value={personId} onChange={(e) => setPersonId(e.target.value)} required>
                  <option value="">Choose someone…</option>
                  {people
                    .slice()
                    .sort((a, b) => a.fullName.localeCompare(b.fullName))
                    .map((p) => (
                      <option key={p.id} value={p.id}>{p.fullName} — {roleLabel(p.role)} ({p.email})</option>
                    ))}
                </select>
              </div>
            )}

            <div className="label" style={{ margin: '16px 0 8px' }}>Type</div>
            <div className="chips">
              {CATEGORIES.map((c) => {
                const I = Icon[c.icon];
                return (
                  <button key={c.type} type="button" className={`chip ${category === c.type ? 'active' : ''}`} onClick={() => setCategory(c.type)}>
                    <I size={15} /> {c.label}
                  </button>
                );
              })}
            </div>

            <div className="field" style={{ marginTop: 18 }}>
              <label htmlFor="n-title">Title</label>
              <input id="n-title" value={title} maxLength={TITLE_MAX} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Speaking class tonight at 19:00" required />
              <span className="hint">{title.length}/{TITLE_MAX}</span>
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="n-msg">Message</label>
              <textarea id="n-msg" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="What do they need to know or do?" required />
            </div>
          </div>
          <div className="card-foot row-end">
            <button className="btn btn-primary" type="submit" disabled={!canSend || sending || (audience === 'person' && !personId)} title={canSend ? undefined : 'View only'}>
              <Icon.Send size={17} /> {sending ? 'Sending…' : 'Send notification'}
            </button>
          </div>
        </form>

        <div className="notify-side">
          <section className="card">
            <div className="card-head"><h2>Preview</h2><span className="muted xs">How it looks on a phone</span></div>
            <div className="card-body">
              <div className="phone-preview">
                <div className="push">
                  <Logo size={30} withText={false} />
                  <div className="push-body">
                    <div className="push-top">
                      <strong>SS Europa</strong>
                      <span>now</span>
                    </div>
                    <div className="push-title"><CatIcon size={13} /> {title || 'Your title'}</div>
                    <p>{message || 'Your message will appear here.'}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <div>
                <h2>Your inbox</h2>
                <p>{unreadCount ? `${unreadCount} unread` : 'All read'}</p>
              </div>
              {unreadCount > 0 && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => void markAllRead()}>
                  <Icon.Check size={15} /> Mark all read
                </button>
              )}
            </div>
            <div className="card-body inbox-body">
              <div className="chips" style={{ marginBottom: 12 }}>
                <button type="button" className={`chip ${inboxFilter === 'all' ? 'active' : ''}`} onClick={() => setInboxFilter('all')}>All <span className="count">{items.length}</span></button>
                <button type="button" className={`chip ${inboxFilter === 'unread' ? 'active' : ''}`} onClick={() => setInboxFilter('unread')}>Unread <span className="count">{unreadCount}</span></button>
              </div>
              {loading ? (
                <Spinner />
              ) : inbox.length === 0 ? (
                <EmptyState icon="Bell" title={inboxFilter === 'unread' ? 'Nothing unread' : 'No notifications yet'} />
              ) : (
                <ul className="inbox">
                  {inbox.map((n) => {
                    const t = typeName(n.type);
                    const I = Icon[TYPE_ICON[t] ?? 'Info'];
                    return (
                      <li key={n.id} className={n.isRead ? '' : 'unread'}>
                        <span className="inbox-icon"><I size={16} /></span>
                        <div className="inbox-main">
                          <div className="inbox-top">
                            <strong>{n.title}</strong>
                            <span className="muted xs nowrap">{timeAgo(n.createdAtUtc)}</span>
                          </div>
                          <p>{n.message}</p>
                          {!n.isRead && (
                            <button type="button" className="link-btn" onClick={() => void markRead(n.id)}>Mark as read</button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
