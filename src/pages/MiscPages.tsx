import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Empty, ErrorBox, Loading, SuccessBox } from '../components/StateBlock';
import { useAuth } from '../hooks/useAuth';
import {
  auditApi,
  certificatesApi,
  notificationsApi,
  usersApi,
} from '../services/platformApi';
import {
  roleLabel,
  TEAM_ROLES,
  type AuditLog,
  type Certificate,
  type NotificationItem,
  type TeamRole,
  type User,
} from '../types';


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

const ROLE_HELP: Record<TeamRole, string> = {
  Admin: 'Full access to courses, live classes, notifications and admissions. Cannot manage team accounts.',
  Staff: 'Admissions & Leads only: handles website contact-form enquiries and updates their status.',
  Mentor: 'Teacher: courses & content, live classes and notifications.',
};

const isTeamRole = (role: string): role is TeamRole => (TEAM_ROLES as readonly string[]).includes(role);

/**
 * Users & Roles — Super Admin only.
 * The Super Admin creates Admin, Staff and Teacher accounts, changes their role,
 * and suspends or removes them. The Super Admin account itself is locked.
 */
export function UsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<'All' | TeamRole>('All');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamRole>('Mentor');
  const [invitePassword, setInvitePassword] = useState('');
  const [submittingInvite, setSubmittingInvite] = useState(false);

  async function load() {
    try {
      setUsers(await usersApi.list());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  // The panel only shows the team: the Super Admin plus Admin, Staff and Teacher accounts.
  const team = users.filter((u) => u.role === 'SuperAdmin' || isTeamRole(u.role));
  const visible = team
    .filter((u) => roleFilter === 'All' || u.role === roleFilter)
    .sort((a, b) => (a.role === 'SuperAdmin' ? -1 : b.role === 'SuperAdmin' ? 1 : a.fullName.localeCompare(b.fullName)));
  const countOf = (r: TeamRole) => team.filter((u) => u.role === r && !u.isDeleted).length;

  const isLocked = (u: User) => u.role === 'SuperAdmin' || u.isProtectedSuperAdmin || u.id === me?.id;

  async function run(action: () => Promise<unknown>, success: string) {
    setError(null);
    setMessage(null);
    try {
      await action();
      setMessage(success);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    }
  }

  async function handleInviteUser(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSubmittingInvite(true);
    try {
      await usersApi.create({
        email: inviteEmail.trim(),
        firstName: inviteFirstName.trim(),
        lastName: inviteLastName.trim(),
        role: inviteRole,
        password: invitePassword,
      });
      setMessage(`${roleLabel(inviteRole)} account created for ${inviteFirstName} ${inviteLastName}. An invitation email has been sent.`);
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteFirstName('');
      setInviteLastName('');
      setInvitePassword('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setSubmittingInvite(false);
    }
  }

  const toggleStatus = (u: User) => {
    const activate = u.status !== 'Active';
    return run(() => usersApi.updateStatus(u.id, activate), `${u.fullName} is now ${activate ? 'active' : 'suspended'}.`);
  };

  const changeRole = (u: User, role: TeamRole) =>
    run(() => usersApi.updateRole(u.id, role), `${u.fullName} is now ${roleLabel(role)}.`);

  const handleRemove = (u: User) => {
    if (!confirm(`Remove ${u.fullName}? They will no longer be able to log in. You can restore them later.`)) return;
    return run(() => usersApi.softDelete(u.id), `${u.fullName} has been removed.`);
  };

  const handleRestore = (u: User) => run(() => usersApi.restore(u.id), `${u.fullName} has been restored.`);

  if (loading) return <Loading />;

  return (
    <div className="animate-rise">
      <div className="page-header">
        <div>
          <h1>Users & Roles</h1>
          <p>
            You are the only Super Admin. Create Admin, Staff and Teacher accounts and control their access.
          </p>
        </div>
        <button className="btn btn-primary" type="button" onClick={() => setShowInviteModal((v) => !v)}>
          {showInviteModal ? 'Close form' : '+ Add team member'}
        </button>
      </div>

      {message && <SuccessBox message={message} />}
      {error && <ErrorBox message={error} />}

      {showInviteModal && (
        <form className="panel" onSubmit={handleInviteUser} style={{ marginBottom: '1.25rem', border: '1px solid var(--azure)' }}>
          <h2>New team member</h2>
          <p style={{ color: 'var(--muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
            They'll get an email with their login details for the SS Europa management portal.
          </p>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="invite-first">First name</label>
              <input id="invite-first" value={inviteFirstName} onChange={(e) => setInviteFirstName(e.target.value)} required placeholder="e.g. Matteo" />
            </div>
            <div className="field">
              <label htmlFor="invite-last">Last name</label>
              <input id="invite-last" value={inviteLastName} onChange={(e) => setInviteLastName(e.target.value)} required placeholder="e.g. Ricci" />
            </div>
          </div>
          <div className="grid-3">
            <div className="field">
              <label htmlFor="invite-email">Email</label>
              <input id="invite-email" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required placeholder="name@sseuropa.com" />
            </div>
            <div className="field">
              <label htmlFor="invite-role">Role</label>
              <select id="invite-role" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as TeamRole)}>
                {TEAM_ROLES.map((r) => (
                  <option key={r} value={r}>{roleLabel(r)}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="invite-password">Temporary password</label>
              <input
                id="invite-password"
                value={invitePassword}
                onChange={(e) => setInvitePassword(e.target.value)}
                required
                minLength={8}
                placeholder="At least 8 characters"
              />
            </div>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem', margin: '0 0 0.75rem' }}>
            <strong>{roleLabel(inviteRole)}:</strong> {ROLE_HELP[inviteRole]}
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-primary" type="submit" disabled={submittingInvite}>
              {submittingInvite ? 'Creating…' : 'Create account & send invite'}
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => setShowInviteModal(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Role filter */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
        {(['All', ...TEAM_ROLES] as const).map((r) => {
          const active = roleFilter === r;
          const count = r === 'All' ? team.filter((u) => !u.isDeleted).length : countOf(r);
          return (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              className={`btn ${active ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.84rem', padding: '0.35rem 0.8rem' }}
            >
              {r === 'All' ? 'Everyone' : `${roleLabel(r)}s`} · {count}
            </button>
          );
        })}
      </div>

      <div className="panel">
        {visible.length === 0 ? (
          <Empty label="No team members yet. Use “Add team member” to create one." />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((u) => {
                const locked = isLocked(u);
                return (
                  <tr key={u.id} style={{ opacity: u.isDeleted ? 0.6 : 1 }}>
                    <td>
                      <strong>{u.fullName}</strong>
                      {u.role === 'SuperAdmin' && (
                        <span style={{ marginLeft: 6, fontSize: '0.75rem', background: 'rgba(212, 175, 55, 0.2)', color: '#b8860b', padding: '2px 6px', borderRadius: 4 }}>
                          🛡️ Super Admin
                        </span>
                      )}
                      {u.isDeleted && (
                        <span style={{ marginLeft: 6, fontSize: '0.75rem', background: 'rgba(230, 57, 70, 0.2)', color: '#e63946', padding: '2px 6px', borderRadius: 4 }}>
                          Removed
                        </span>
                      )}
                    </td>
                    <td>{u.email}</td>
                    <td>
                      {locked || u.isDeleted || !isTeamRole(u.role) ? (
                        <span className="badge">{roleLabel(u.role)}</span>
                      ) : (
                        <select
                          aria-label={`Role for ${u.fullName}`}
                          value={u.role}
                          onChange={(e) => void changeRole(u, e.target.value as TeamRole)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            background: 'var(--panel-2, rgba(255,255,255,0.05))',
                            color: 'inherit',
                            border: '1px solid var(--border)',
                          }}
                        >
                          {TEAM_ROLES.map((r) => (
                            <option key={r} value={r}>{roleLabel(r)}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${u.status === 'Active' ? 'badge-success' : 'badge-warn'}`}>{u.status}</span>
                    </td>
                    <td>
                      {locked ? (
                        <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>Locked</span>
                      ) : (
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          {!u.isDeleted && (
                            <button
                              className="btn btn-secondary"
                              type="button"
                              style={{ fontSize: '0.78rem', padding: '0.25rem 0.6rem' }}
                              onClick={() => void toggleStatus(u)}
                            >
                              {u.status === 'Active' ? 'Suspend' : 'Activate'}
                            </button>
                          )}
                          {u.isDeleted ? (
                            <button
                              className="btn btn-primary"
                              type="button"
                              style={{ fontSize: '0.78rem', padding: '0.25rem 0.6rem' }}
                              onClick={() => void handleRestore(u)}
                            >
                              Restore
                            </button>
                          ) : (
                            <button
                              type="button"
                              style={{
                                background: 'transparent',
                                border: '1px solid rgba(230,57,70,0.4)',
                                color: '#e63946',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.78rem',
                                padding: '0.25rem 0.6rem',
                              }}
                              onClick={() => void handleRemove(u)}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
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
  const { hasRole } = useAuth();
  const isSuperAdmin = hasRole('SuperAdmin');
  return (
    <div className="animate-rise">
      <div className="page-header">
        <div>
          <h1>Admin console</h1>
          <p>Operational shortcuts for courses, classes, enquiries{isSuperAdmin ? ', team and audit' : ''}.</p>
        </div>
      </div>
      <div className="grid-3">
        <Link className="panel" to="/app/enquiries"><h2>Admissions & Leads</h2><p>Review website contact enquiries and student pipeline.</p></Link>
        <Link className="panel" to="/app/courses"><h2>Courses</h2><p>Publish and manage catalogue capacity.</p></Link>
        <Link className="panel" to="/app/classes"><h2>Live Classes</h2><p>Schedule classes and share join links.</p></Link>
        {isSuperAdmin && <Link className="panel" to="/app/users"><h2>Users & Roles</h2><p>Create Admin, Staff and Teacher accounts.</p></Link>}
        {isSuperAdmin && <Link className="panel" to="/app/audit"><h2>Audit Log</h2><p>Inspect authentication and admin events.</p></Link>}
        <Link className="panel" to="/app/notifications"><h2>Notifications</h2><p>Send updates to students.</p></Link>
      </div>
    </div>
  );
}
