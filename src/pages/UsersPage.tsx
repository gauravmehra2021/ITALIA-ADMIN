import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Icon, type IconName } from '../components/Icons';
import { Alert, EmptyState, Modal, PageHeader, Person, Spinner } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { usersApi } from '../services/platformApi';
import { roleLabel, TEAM_ROLES, type TeamRole, type User } from '../types';
import './pages.css';

/**
 * Users & Roles — Super Admin only.
 * The Super Admin creates Admin, Staff and Teacher accounts, changes their role,
 * and suspends or removes them. The Super Admin account itself is locked.
 */

const ROLE_INFO: Record<TeamRole | 'SuperAdmin', { icon: IconName; tone: string; access: string }> = {
  SuperAdmin: { icon: 'ShieldCheck', tone: 'gold', access: 'Everything, plus team accounts and the audit log. Only one exists.' },
  Admin: { icon: 'Shield', tone: 'purple', access: 'Admissions, courses, live classes and notifications.' },
  Staff: { icon: 'Inbox', tone: 'blue', access: 'Admissions & Leads only — website enquiries.' },
  Mentor: { icon: 'Cap', tone: 'green', access: 'Courses & content, live classes and notifications.' },
};

type Filter = 'All' | TeamRole | 'Removed';

const isTeamRole = (role: string): role is TeamRole => (TEAM_ROLES as readonly string[]).includes(role);

function makePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  let p = '';
  for (let i = 0; i < 10; i++) p += pick(chars);
  return `${p}${pick('23456789')}!`;
}

export function UsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('All');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<User | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<TeamRole>('Mentor');
  const [password, setPassword] = useState(makePassword);
  const [showPw, setShowPw] = useState(true);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function load() {
    try {
      setUsers(await usersApi.list());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the team.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  // The panel only shows the team: the Super Admin plus Admin, Staff and Teacher accounts.
  const team = useMemo(() => users.filter((u) => u.role === 'SuperAdmin' || isTeamRole(u.role)), [users]);
  const countOf = (r: TeamRole | 'SuperAdmin') => team.filter((u) => u.role === r && !u.isDeleted).length;
  const removedCount = team.filter((u) => u.isDeleted).length;

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return team
      .filter((u) => (filter === 'Removed' ? u.isDeleted : filter === 'All' ? !u.isDeleted : u.role === filter && !u.isDeleted))
      .filter((u) => !q || u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
      .sort((a, b) => (a.role === 'SuperAdmin' ? -1 : b.role === 'SuperAdmin' ? 1 : a.fullName.localeCompare(b.fullName)));
  }, [team, filter, search]);

  const isLocked = (u: User) => u.role === 'SuperAdmin' || u.isProtectedSuperAdmin || u.id === me?.id;

  async function run(u: User, action: () => Promise<unknown>, success: string) {
    setBusyId(u.id);
    setError(null);
    setToast(null);
    try {
      await action();
      setToast(success);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusyId(null);
    }
  }

  const toggleStatus = (u: User) => {
    const activate = u.status !== 'Active';
    return run(u, () => usersApi.updateStatus(u.id, activate), `${u.fullName} is now ${activate ? 'active' : 'suspended'}.`);
  };
  const changeRole = (u: User, r: TeamRole) => run(u, () => usersApi.updateRole(u.id, r), `${u.fullName} is now ${roleLabel(r)}.`);
  const restore = (u: User) => run(u, () => usersApi.restore(u.id), `${u.fullName} has been restored.`);
  async function remove() {
    if (!confirmRemove) return;
    const u = confirmRemove;
    setConfirmRemove(null);
    await run(u, () => usersApi.softDelete(u.id), `${u.fullName} has been removed. You can restore them from “Removed”.`);
  }

  function openForm() {
    setFirstName('');
    setLastName('');
    setEmail('');
    setRole('Mentor');
    setPassword(makePassword());
    setShowPw(true);
    setFormError(null);
    setFormOpen(true);
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setFormError(null);
    try {
      await usersApi.create({ email: email.trim(), firstName: firstName.trim(), lastName: lastName.trim(), role, password });
      setToast(`${roleLabel(role)} account created for ${firstName.trim()} ${lastName.trim()}. Share the temporary password with them privately.`);
      setFormOpen(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not create the account.');
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <Spinner label="Loading the team…" />;

  return (
    <div className="page">
      <PageHeader
        title="Users & Roles"
        subtitle="You are the only Super Admin. Create accounts for your Admins, Staff and Teachers and control what they can open."
        actions={<button type="button" className="btn btn-primary" onClick={openForm}><Icon.UserPlus size={18} /> Add team member</button>}
      />

      {toast && <Alert tone="success" onClose={() => setToast(null)}>{toast}</Alert>}
      {error && <Alert tone="error" onClose={() => setError(null)}>{error}</Alert>}

      <div className="role-cards">
        {(['SuperAdmin', ...TEAM_ROLES] as const).map((r) => {
          const info = ROLE_INFO[r];
          const I = Icon[info.icon];
          const clickable = r !== 'SuperAdmin';
          const active = filter === r;
          const body = (
            <>
              <div className="role-card-top">
                <span className={`stat-icon tone-${info.tone}`}><I size={19} /></span>
                <span className="role-card-count">{countOf(r)}</span>
              </div>
              <strong>{roleLabel(r)}</strong>
              <p>{info.access}</p>
            </>
          );
          return clickable ? (
            <button key={r} type="button" className={`role-card ${active ? 'active' : ''}`} onClick={() => setFilter(active ? 'All' : r)} aria-pressed={active}>
              {body}
            </button>
          ) : (
            <div key={r} className="role-card">{body}</div>
          );
        })}
      </div>

      <section className="card">
        <div className="card-head toolbar">
          <div className="chips">
            {(['All', ...TEAM_ROLES, 'Removed'] as Filter[]).map((f) => (
              <button key={f} type="button" className={`chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                {f === 'All' ? 'Everyone' : f === 'Removed' ? 'Removed' : roleLabel(f)}
                <span className="count">{f === 'All' ? team.filter((u) => !u.isDeleted).length : f === 'Removed' ? removedCount : countOf(f)}</span>
              </button>
            ))}
          </div>
          <label className="search">
            <Icon.Search size={17} />
            <input className="input" type="search" placeholder="Search name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
        </div>

        {visible.length === 0 ? (
          <EmptyState
            icon="Users"
            title={filter === 'Removed' ? 'No removed accounts' : 'No team members here yet'}
            text={filter === 'Removed' ? undefined : 'Use “Add team member” to create the first account.'}
          />
        ) : (
          <div className="table-wrap">
            <table className="table table-cards">
              <thead>
                <tr>
                  <th>Team member</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th className="actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((u) => {
                  const locked = isLocked(u);
                  const busy = busyId === u.id;
                  const status = u.isDeleted ? 'Removed' : u.status === 'Active' ? 'Active' : u.status === 'PendingVerification' ? 'Invited' : 'Suspended';
                  const tone = status === 'Active' ? 'green' : status === 'Invited' ? 'blue' : status === 'Removed' ? 'gray' : 'red';
                  return (
                    <tr key={u.id} className={u.isDeleted ? 'is-dim' : ''}>
                      <td data-label="Team member">
                        <Person name={u.fullName} sub={u.email} />
                      </td>
                      <td data-label="Role">
                        {locked || u.isDeleted || !isTeamRole(u.role) ? (
                          <span className={`badge badge-${u.role === 'SuperAdmin' ? 'gold' : 'blue'}`}>
                            {u.role === 'SuperAdmin' && <Icon.ShieldCheck size={13} />} {roleLabel(u.role)}
                          </span>
                        ) : (
                          <select
                            className="select input-sm role-select"
                            aria-label={`Role for ${u.fullName}`}
                            value={u.role}
                            disabled={busy}
                            onChange={(e) => void changeRole(u, e.target.value as TeamRole)}
                          >
                            {TEAM_ROLES.map((r) => (
                              <option key={r} value={r}>{roleLabel(r)}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td data-label="Status"><span className={`badge badge-dot badge-${tone}`}>{status}</span></td>
                      <td className="actions">
                        {locked ? (
                          <span className="muted small locked"><Icon.Lock size={14} /> Protected</span>
                        ) : u.isDeleted ? (
                          <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => void restore(u)}>
                            <Icon.Undo size={15} /> Restore
                          </button>
                        ) : (
                          <div className="row-end">
                            <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => void toggleStatus(u)}>
                              {u.status === 'Active' ? <><Icon.Pause size={15} /> Suspend</> : <><Icon.CheckCircle size={15} /> Activate</>}
                            </button>
                            <button type="button" className="icon-btn sm danger" disabled={busy} onClick={() => setConfirmRemove(u)} title="Remove account" aria-label={`Remove ${u.fullName}`}>
                              <Icon.Trash size={15} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Add team member ── */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Add a team member"
        subtitle="They sign in to this console with their email and the temporary password below."
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setFormOpen(false)} disabled={creating}>Cancel</button>
            <button type="submit" form="member-form" className="btn btn-primary" disabled={creating}>{creating ? 'Creating…' : 'Create account'}</button>
          </>
        }
      >
        <form id="member-form" onSubmit={create}>
          {formError && <div style={{ marginBottom: 14 }}><Alert tone="error">{formError}</Alert></div>}
          <div className="grid-2">
            <div className="field">
              <label htmlFor="m-first">First name</label>
              <input id="m-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="e.g. Matteo" required />
            </div>
            <div className="field">
              <label htmlFor="m-last">Last name</label>
              <input id="m-last" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="e.g. Ricci" required />
            </div>
          </div>
          <div className="field">
            <label htmlFor="m-email">Work email</label>
            <input id="m-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@sseuropa.com" required />
          </div>

          <div className="label" style={{ marginBottom: 8 }}>Role</div>
          <div className="role-picker" role="radiogroup" aria-label="Role">
            {TEAM_ROLES.map((r) => {
              const I = Icon[ROLE_INFO[r].icon];
              return (
                <button key={r} type="button" role="radio" aria-checked={role === r} className={`audience ${role === r ? 'active' : ''}`} onClick={() => setRole(r)}>
                  <I size={18} />
                  <span>
                    <strong>{roleLabel(r)}</strong>
                    <small>{ROLE_INFO[r].access}</small>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="field" style={{ marginTop: 16, marginBottom: 0 }}>
            <label htmlFor="m-pass">Temporary password</label>
            <div className="pw-row">
              <input id="m-pass" type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
              <button type="button" className="icon-btn" onClick={() => setShowPw((v) => !v)} title={showPw ? 'Hide' : 'Show'} aria-label={showPw ? 'Hide password' : 'Show password'}>
                {showPw ? <Icon.EyeOff size={17} /> : <Icon.Eye size={17} />}
              </button>
              <button type="button" className="icon-btn" onClick={() => setPassword(makePassword())} title="Generate a new password" aria-label="Generate a new password">
                <Icon.Refresh size={17} />
              </button>
              <button type="button" className="icon-btn" onClick={() => void navigator.clipboard?.writeText(password)} title="Copy" aria-label="Copy password">
                <Icon.Copy size={17} />
              </button>
            </div>
            <span className="hint">At least 8 characters. Send it to them privately (not by group chat) and ask them to change it after signing in.</span>
          </div>
        </form>
      </Modal>

      {/* ── Confirm removal ── */}
      <Modal
        open={!!confirmRemove}
        onClose={() => setConfirmRemove(null)}
        title={`Remove ${confirmRemove?.fullName ?? ''}?`}
        subtitle="They will no longer be able to sign in. You can restore the account later."
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setConfirmRemove(null)}>Cancel</button>
            <button type="button" className="btn btn-danger" onClick={() => void remove()}><Icon.Trash size={16} /> Remove account</button>
          </>
        }
      >
        {confirmRemove && <Person name={confirmRemove.fullName} sub={`${roleLabel(confirmRemove.role)} · ${confirmRemove.email}`} size="lg" />}
      </Modal>
    </div>
  );
}
