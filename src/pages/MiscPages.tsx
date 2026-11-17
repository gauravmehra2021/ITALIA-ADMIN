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
  type AuditLog,
  type Certificate,
  type NotificationItem,
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

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');
  const [inviteRole, setInviteRole] = useState<'1' | '2' | '3'>('1'); // 1 = Mentor, 2 = Staff, 3 = Admin
  const [invitePassword, setInvitePassword] = useState('SSEuropa@2026');
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
        role: Number(inviteRole),
        password: invitePassword,
      });
      setMessage(`New account created for ${inviteFirstName} ${inviteLastName}! Onboarding invitation email dispatched.`);
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteFirstName('');
      setInviteLastName('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user account');
    } finally {
      setSubmittingInvite(false);
    }
  }

  async function toggleStatus(u: User) {
    setError(null);
    setMessage(null);
    const newActive = u.status !== 'Active';
    try {
      await usersApi.updateStatus(u.id, newActive);
      setMessage(`User ${u.fullName} is now ${newActive ? 'Active' : 'Suspended'}.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update user status');
    }
  }

  async function handleSoftDelete(u: User) {
    if (u.isProtectedSuperAdmin) {
      alert('This is a protected permanent Super Administrator account and cannot be deleted.');
      return;
    }
    if (!confirm(`Are you sure you want to deactivate and soft-delete user '${u.fullName}'? They will no longer be able to log in.`)) return;

    setError(null);
    setMessage(null);
    try {
      await usersApi.softDelete(u.id);
      setMessage(`User ${u.fullName} has been deactivated (soft deleted).`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to soft delete user');
    }
  }

  async function handleRestore(u: User) {
    setError(null);
    setMessage(null);
    try {
      await usersApi.restore(u.id);
      setMessage(`User ${u.fullName} has been restored to active status.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to restore user');
    }
  }

  async function changeRole(u: User, newRole: string) {
    setError(null);
    setMessage(null);
    try {
      await usersApi.updateRole(u.id, newRole);
      setMessage(`Role for ${u.fullName} updated.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update user role');
    }
  }

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} />;

  return (
    <div className="animate-rise">
      <div className="page-header">
        <div>
          <h1>Users & Roles Directory</h1>
          <p>SuperAdmin & Administrator control panel. Create staff roles, manage permissions, and govern access with soft-delete protection.</p>
        </div>
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => setShowInviteModal((v) => !v)}
        >
          {showInviteModal ? 'Close Form' : '+ Create / Invite Staff & Mentors'}
        </button>
      </div>

      {message && <SuccessBox message={message} />}

      {showInviteModal && (
        <form className="panel" onSubmit={handleInviteUser} style={{ marginBottom: '1.25rem', border: '1px solid var(--azure)' }}>
          <h2>Create Platform Staff / Teacher Account</h2>
          <p style={{ color: 'var(--muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
            The created user will receive an onboarding email invitation with credentials to log in to the SS Europa Management Portal.
          </p>
          <div className="grid-2">
            <div className="field">
              <label>First Name</label>
              <input value={inviteFirstName} onChange={(e) => setInviteFirstName(e.target.value)} required placeholder="e.g. Matteo" />
            </div>
            <div className="field">
              <label>Last Name</label>
              <input value={inviteLastName} onChange={(e) => setInviteLastName(e.target.value)} required placeholder="e.g. Ricci" />
            </div>
          </div>
          <div className="grid-3">
            <div className="field">
              <label>Email Address</label>
              <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required placeholder="mentor@sseuropa.com" />
            </div>
            <div className="field">
              <label>Assigned Role</label>
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as '1' | '2' | '3')}>
                <option value="1">Mentor / Teacher</option>
                <option value="2">Staff (Admissions / Operations)</option>
                <option value="3">Administrator</option>
              </select>
            </div>
            <div className="field">
              <label>Temporary Password</label>
              <input value={invitePassword} onChange={(e) => setInvitePassword(e.target.value)} required placeholder="SSEuropa@2026" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button className="btn btn-primary" type="submit" disabled={submittingInvite}>
              {submittingInvite ? 'Creating & Sending Email…' : 'Create Account & Send Invite'}
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => setShowInviteModal(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="panel">
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
            {users.map((u) => (
              <tr key={u.id} style={{ opacity: u.isDeleted ? 0.6 : 1 }}>
                <td>
                  <strong>{u.fullName}</strong>
                  {u.isProtectedSuperAdmin && (
                    <span style={{ marginLeft: 6, fontSize: '0.75rem', background: 'rgba(212, 175, 55, 0.2)', color: '#d4af37', padding: '2px 6px', borderRadius: 4 }}>
                      🛡️ Protected SuperAdmin
                    </span>
                  )}
                  {u.isDeleted && (
                    <span style={{ marginLeft: 6, fontSize: '0.75rem', background: 'rgba(230, 57, 70, 0.2)', color: '#e63946', padding: '2px 6px', borderRadius: 4 }}>
                      Soft Deleted
                    </span>
                  )}
                </td>
                <td>{u.email}</td>
                <td>
                  <select
                    value={u.role}
                    disabled={u.isProtectedSuperAdmin}
                    onChange={(e) => void changeRole(u, e.target.value)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      background: 'var(--panel-2, rgba(255,255,255,0.05))',
                      color: 'inherit',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <option value="0">Student / User</option>
                    <option value="1">Mentor / Teacher</option>
                    <option value="2">Staff</option>
                    <option value="3">Admin</option>
                    <option value="4">SuperAdmin</option>
                  </select>
                </td>
                <td>
                  <span className={`badge ${u.status === 'Active' ? 'badge-success' : 'badge-warn'}`}>
                    {u.status}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      className="btn btn-secondary"
                      type="button"
                      style={{ fontSize: '0.78rem', padding: '0.25rem 0.6rem' }}
                      disabled={u.isProtectedSuperAdmin}
                      onClick={() => void toggleStatus(u)}
                    >
                      {u.status === 'Active' ? 'Suspend' : 'Activate'}
                    </button>

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
                      !u.isProtectedSuperAdmin && (
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
                          onClick={() => void handleSoftDelete(u)}
                        >
                          Soft Delete
                        </button>
                      )
                    )}
                  </div>
                </td>
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
          <p>Operational shortcuts for courses, users, enquiries, and audit oversight.</p>
        </div>
      </div>
      <div className="grid-3">
        <Link className="panel" to="/app/enquiries"><h2>Admissions & Leads</h2><p>Review website contact enquiries and student pipeline.</p></Link>
        <Link className="panel" to="/app/courses"><h2>Courses</h2><p>Publish and manage catalogue capacity.</p></Link>
        <Link className="panel" to="/app/users"><h2>Users</h2><p>Review roles and account status.</p></Link>
        <Link className="panel" to="/app/audit"><h2>Security audit</h2><p>Inspect authentication and admin events.</p></Link>
        <Link className="panel" to="/app/notifications"><h2>Comms</h2><p>Platform notifications feed.</p></Link>
      </div>
    </div>
  );
}
