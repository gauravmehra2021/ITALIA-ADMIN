import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Empty, ErrorBox, Loading, SuccessBox } from '../components/StateBlock';
import { useAuth } from '../hooks/useAuth';
import {
  auditApi,
  certificatesApi,
  notificationsApi,
  paymentsApi,
  subscriptionsApi,
  supportApi,
  usersApi,
} from '../services/platformApi';
import {
  enumLabel,
  type AuditLog,
  type Certificate,
  type NotificationItem,
  type Payment,
  type Subscription,
  type SupportTicket,
  type User,
} from '../types';

const SUB_STATUS = ['Pending', 'Active', 'PastDue', 'Cancelled', 'Suspended'];
const PAY_STATUS = ['Pending', 'Completed', 'Failed', 'Refunded'];
const TICKET_STATUS = ['Open', 'InProgress', 'Resolved', 'Closed'];

export function SubscriptionsPage() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        setSubs(await subscriptionsApi.list());
        setPayments(await paymentsApi.list());
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load subscriptions');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} />;

  return (
    <div className="animate-rise">
      <div className="page-header"><div><h1>Subscriptions & payments</h1><p>Mock PayPal lifecycle records served by the API.</p></div></div>
      <div className="grid-2">
        <section className="panel">
          <h2>Subscriptions</h2>
          {subs.length === 0 ? <Empty /> : (
            <table className="table">
              <thead><tr><th>Plan</th><th>Course</th><th>Status</th></tr></thead>
              <tbody>
                {subs.map((s) => (
                  <tr key={s.id}>
                    <td>{s.planName}{s.isMocked && <span className="badge badge-warn" style={{ marginLeft: 6 }}>mock</span>}</td>
                    <td>{s.courseTitle}</td>
                    <td>{enumLabel(s.status, SUB_STATUS)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <section className="panel">
          <h2>Payments</h2>
          {payments.length === 0 ? <Empty /> : (
            <table className="table">
              <thead><tr><th>Amount</th><th>Status</th><th>Reference</th></tr></thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>{p.currency} {p.amount}</td>
                    <td>{enumLabel(p.status, PAY_STATUS)}</td>
                    <td>{p.payPalReference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}

export function CertificatesPage() {
  const [items, setItems] = useState<Certificate[]>([]);
  const [code, setCode] = useState('SSE-20261001-PRYA81');
  const [verified, setVerified] = useState<Certificate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        setItems(await certificatesApi.list());
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load certificates');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function verify(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      setVerified(await certificatesApi.verify(code));
    } catch (err) {
      setVerified(null);
      setError(err instanceof Error ? err.message : 'Verification failed');
    }
  }

  if (loading) return <Loading />;

  return (
    <div className="animate-rise">
      <div className="page-header"><div><h1>Certificates</h1><p>Issue metadata and public verification by certificate code.</p></div></div>
      {error && <ErrorBox message={error} />}
      <div className="grid-2">
        <section className="panel">
          <h2>My certificates</h2>
          {items.length === 0 ? <Empty /> : items.map((c) => (
            <article key={c.id} style={{ marginBottom: '0.85rem' }}>
              <strong>{c.courseTitle}</strong>
              <div>{c.certificateCode}</div>
              <div style={{ color: 'var(--muted)' }}>Issued {new Date(c.issuedAtUtc).toLocaleDateString()}</div>
            </article>
          ))}
        </section>
        <section className="panel">
          <h2>Verify certificate</h2>
          <form onSubmit={verify}>
            <div className="field"><label>Code</label><input value={code} onChange={(e) => setCode(e.target.value)} /></div>
            <button className="btn btn-primary" type="submit">Verify</button>
          </form>
          {verified && (
            <SuccessBox message={`Valid: ${verified.userName} — ${verified.courseTitle}`} />
          )}
        </section>
      </div>
    </div>
  );
}

export function NotificationsPage() {
  const { hasRole } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Dispatch form state
  const [targetAudience, setTargetAudience] = useState<'students' | 'teachers' | 'staff' | 'admins' | 'all' | 'specific'>('students');
  const [specificUserId, setSpecificUserId] = useState('');
  const [notifCategory, setNotifCategory] = useState<number>(3); // 3 = Announcement, 0 = Class, 2 = Test, 4 = Security
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');

  async function load() {
    setLoading(true);
    try {
      setItems(await notificationsApi.list());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function markRead(id: string) {
    await notificationsApi.markRead(id);
    await load();
  }

  async function handleSendNotification(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    setMessage(null);

    let targetRole: number | null = null;
    let targetUserId: string | null = null;

    if (targetAudience === 'students') {
      targetRole = 0; // UserRole.User
    } else if (targetAudience === 'teachers') {
      targetRole = 1; // UserRole.Mentor
    } else if (targetAudience === 'staff') {
      targetRole = 4; // UserRole.Staff
    } else if (targetAudience === 'admins') {
      targetRole = 2; // UserRole.Admin
    } else if (targetAudience === 'specific') {
      targetUserId = specificUserId.trim();
    }

    try {
      const res = await notificationsApi.send({
        title: notifTitle.trim(),
        message: notifMessage.trim(),
        type: notifCategory,
        targetRole,
        targetUserId,
      });

      setMessage(`Notification dispatched successfully to ${res.sentCount} recipient(s) (${res.targetDescription}).`);
      setNotifTitle('');
      setNotifMessage('');
      setSpecificUserId('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to dispatch notification');
    } finally {
      setSending(false);
    }
  }

  const isTeacher = hasRole('Mentor') && !hasRole('Admin') && !hasRole('SuperAdmin');
  const isStaff = hasRole('Staff') && !hasRole('Admin') && !hasRole('SuperAdmin');
  const isAdmin = hasRole('Admin') && !hasRole('SuperAdmin');
  const isSuperAdmin = hasRole('SuperAdmin');
  const canSend = isTeacher || isStaff || isAdmin || isSuperAdmin;

  return (
    <div className="animate-rise">
      <div className="page-header">
        <div>
          <h1>Notification Center & Dispatcher</h1>
          <p>
            {isTeacher && 'Teachers can dispatch reminders and announcements to students.'}
            {isStaff && 'Admissions Staff can dispatch updates and notices to students.'}
            {isAdmin && 'Admins can dispatch notifications to Teachers, Staff, and Students.'}
            {isSuperAdmin && 'Super Admins can dispatch notifications across all platform roles.'}
          </p>
        </div>
      </div>

      {message && <SuccessBox message={message} />}
      {error && <ErrorBox message={error} />}

      {canSend && (
        <form className="panel" onSubmit={handleSendNotification} style={{ marginBottom: '1.25rem' }}>
          <h2>📢 Send Notification</h2>
          <p style={{ color: 'var(--muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
            Notifications are pushed directly to mobile students and logged in platform users.
          </p>
          <div className="grid-2">
            <div className="field">
              <label>Target Audience</label>
              <select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value as typeof targetAudience)}
              >
                {/* Teacher and Staff can send to Students */}
                <option value="students">🎓 All Students (Mobile App)</option>

                {/* Admin can send to Teachers, Staff and Students */}
                {(isAdmin || isSuperAdmin) && (
                  <>
                    <option value="teachers">👨‍🏫 All Teachers (Mentors)</option>
                    <option value="staff">💼 All Admissions Staff</option>
                  </>
                )}

                {/* Super Admin can also send to Admins and All */}
                {isSuperAdmin && (
                  <>
                    <option value="admins">🛡️ All Administrators</option>
                    <option value="all">🌐 All Platform Accounts</option>
                  </>
                )}

                <option value="specific">👤 Specific User ID</option>
              </select>
            </div>

            <div className="field">
              <label>Notification Category</label>
              <select value={notifCategory} onChange={(e) => setNotifCategory(Number(e.target.value))}>
                <option value={3}>📢 Platform Announcement</option>
                <option value={0}>⏰ Class Session Alert</option>
                <option value={2}>📝 Assessment / Test Reminder</option>
                <option value={4}>🔒 Security & Account Alert</option>
              </select>
            </div>
          </div>

          {targetAudience === 'specific' && (
            <div className="field">
              <label>Recipient User GUID</label>
              <input
                value={specificUserId}
                onChange={(e) => setSpecificUserId(e.target.value)}
                placeholder="e.g. 44444444-4444-4444-4444-444444444444"
                required
              />
            </div>
          )}

          <div className="field">
            <label>Subject / Title</label>
            <input
              value={notifTitle}
              onChange={(e) => setNotifTitle(e.target.value)}
              placeholder="e.g. Class Starting Soon: Join Google Meet"
              required
            />
          </div>

          <div className="field">
            <label>Message Body</label>
            <textarea
              rows={3}
              value={notifMessage}
              onChange={(e) => setNotifMessage(e.target.value)}
              placeholder="Type your alert message here..."
              required
            />
          </div>

          <button className="btn btn-primary" type="submit" disabled={sending}>
            {sending ? 'Dispatching…' : '🚀 Dispatch notification'}
          </button>
        </form>
      )}

      <div className="panel">
        <h2 style={{ marginBottom: '0.75rem' }}>Your Feed & Recent Alerts</h2>
        {loading ? (
          <Loading />
        ) : items.length === 0 ? (
          <Empty label="No notifications received." />
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {items.map((n) => (
              <article
                key={n.id}
                style={{
                  opacity: n.isRead ? 0.65 : 1,
                  padding: '0.75rem',
                  background: 'var(--panel-2, rgba(255, 255, 255, 0.03))',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>{n.title}</strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                    {new Date(n.createdAtUtc).toLocaleString()}
                  </span>
                </div>
                <div style={{ color: 'var(--muted)', marginTop: '0.25rem', fontSize: '0.9rem' }}>{n.message}</div>
                {!n.isRead && (
                  <button className="btn btn-secondary" type="button" style={{ marginTop: 8, fontSize: '0.8rem', padding: '4px 10px' }} onClick={() => void markRead(n.id)}>
                    Mark as read
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setTickets(await supportApi.list());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await supportApi.create(subject, description);
      setSubject('');
      setDescription('');
      setMessage('Support ticket submitted.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ticket');
    }
  }

  return (
    <div className="animate-rise">
      <div className="page-header"><div><h1>Helpdesk</h1><p>Open and track support tickets.</p></div></div>
      {message && <SuccessBox message={message} />}
      {error && <ErrorBox message={error} />}
      <div className="grid-2">
        <form className="panel" onSubmit={onSubmit}>
          <h2>New ticket</h2>
          <div className="field"><label>Subject</label><input value={subject} onChange={(e) => setSubject(e.target.value)} required /></div>
          <div className="field"><label>Description</label><textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} required /></div>
          <button className="btn btn-primary" type="submit">Submit</button>
        </form>
        <section className="panel">
          <h2>Tickets</h2>
          {loading ? <Loading /> : tickets.length === 0 ? <Empty /> : tickets.map((t) => (
            <article key={t.id} style={{ marginBottom: '0.85rem' }}>
              <strong>{t.subject}</strong>
              <div><span className="badge">{enumLabel(t.status, TICKET_STATUS)}</span></div>
              <div style={{ color: 'var(--muted)' }}>{t.description}</div>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        setUsers(await usersApi.list());
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load users');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} />;

  return (
    <div className="animate-rise">
      <div className="page-header"><div><h1>Users</h1><p>Admin directory of platform accounts.</p></div></div>
      <div className="panel">
        <table className="table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.fullName}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>{u.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AuditPage() {
  const [items, setItems] = useState<AuditLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        setItems(await auditApi.list());
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load audit logs');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} />;

  return (
    <div className="animate-rise">
      <div className="page-header"><div><h1>Audit log</h1><p>Security and administrative events.</p></div></div>
      <div className="panel">
        <table className="table">
          <thead><tr><th>Action</th><th>Resource</th><th>Details</th><th>When</th></tr></thead>
          <tbody>
            {items.map((a) => (
              <tr key={a.id}>
                <td>{a.action}</td>
                <td>{a.resource}</td>
                <td>{a.details}</td>
                <td>{new Date(a.createdAtUtc).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


export function AdminPage() {
  return (
    <div className="animate-rise">
      <div className="page-header">
        <div>
          <h1>Admin console</h1>
          <p>Operational shortcuts for courses, users, payments, and audit oversight.</p>
        </div>
      </div>
      <div className="grid-3">
        <Link className="panel" to="/app/courses"><h2>Courses</h2><p>Publish and manage catalogue capacity.</p></Link>
        <Link className="panel" to="/app/users"><h2>Users</h2><p>Review roles and account status.</p></Link>
        <Link className="panel" to="/app/audit"><h2>Security audit</h2><p>Inspect authentication and admin events.</p></Link>
        <Link className="panel" to="/app/subscriptions"><h2>Payments</h2><p>Mock PayPal subscription ledger.</p></Link>
        <Link className="panel" to="/app/support"><h2>Helpdesk</h2><p>Track open support tickets.</p></Link>
        <Link className="panel" to="/app/notifications"><h2>Comms</h2><p>Platform notifications feed.</p></Link>
      </div>
    </div>
  );
}
