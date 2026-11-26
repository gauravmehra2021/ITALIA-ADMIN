import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Icon, type IconName } from '../components/Icons';
import { Alert, EmptyState, Modal, PageHeader, Person, Spinner, formatDate, timeAgo } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { usersApi } from '../services/platformApi';
import {
  PERMISSION_MODULES,
  ROLE_DEFAULT_PERMISSIONS,
  roleLabel,
  TEAM_ROLES,
  type AccessLevel,
  type PermissionMap,
  type TeamRole,
  type User,
} from '../types';
import './pages.css';
import './team.css';

/**
 * Team — Super Admin only.
 * Add Admin, Staff and Teacher accounts, edit their details, choose what each person can open
 * (No access / View only / Full, never more than their role allows), reset passwords,
 * suspend, remove and restore. The Super Admin account itself is locked.
 */

const ROLE_INFO: Record<TeamRole | 'SuperAdmin', { icon: IconName; tone: string; access: string }> = {
  SuperAdmin: { icon: 'ShieldCheck', tone: 'gold', access: 'Everything, plus the team and the audit log. Only one exists.' },
  Admin: { icon: 'Shield', tone: 'purple', access: 'Starts with full access to every area. You can change any area per person.' },
  Staff: { icon: 'Inbox', tone: 'blue', access: 'Starts with Admissions & Leads and students. You can give any other area.' },
  Mentor: { icon: 'Cap', tone: 'green', access: 'Starts with courses, live classes and notifications. You can give any other area.' },
};

const LEVELS: { value: AccessLevel; label: string }[] = [
  { value: 'None', label: 'No access' },
  { value: 'View', label: 'View' },
  { value: 'Full', label: 'Full' },
];

type Filter = 'All' | TeamRole | 'Suspended' | 'Removed';
type RoleDefaults = Record<TeamRole, PermissionMap>;
type Tab = 'details' | 'permissions' | 'security';

const isTeamRole = (role: string): role is TeamRole => (TEAM_ROLES as readonly string[]).includes(role);

function makePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  let p = '';
  for (let i = 0; i < 10; i++) p += pick(chars);
  return `${p}${pick('23456789')}!`;
}

function statusOf(u: User) {
  if (u.isDeleted) return { label: 'Removed', tone: 'gray' };
  if (u.status === 'Active') return { label: 'Active', tone: 'green' };
  if (u.status === 'PendingVerification') return { label: 'Invited', tone: 'blue' };
  return { label: 'Suspended', tone: 'red' };
}

/** The member's current access, filled in from the role when the server sent nothing. */
function accessOf(u: User, roleDefaults: RoleDefaults): PermissionMap {
  const base = isTeamRole(u.role) ? roleDefaults[u.role] : ROLE_DEFAULT_PERMISSIONS.Admin;
  return Object.fromEntries(PERMISSION_MODULES.map((m) => [m.key, u.permissions?.[m.key] ?? base[m.key]])) as PermissionMap;
}

function sameMap(a: PermissionMap, b: PermissionMap) {
  return PERMISSION_MODULES.every((m) => a[m.key] === b[m.key]);
}

export function TeamPage() {
  const { user: me } = useAuth();
  const [team, setTeam] = useState<User[]>([]);
  const [roleDefaults, setRoleDefaults] = useState<RoleDefaults>(ROLE_DEFAULT_PERMISSIONS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('All');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<{ id: string; tab: Tab } | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<User | null>(null);

  const load = useCallback(async () => {
    try {
      setTeam(await usersApi.team());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the team.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    usersApi.catalog().then((c) => setRoleDefaults(c.roleDefaults)).catch(() => undefined);
  }, [load]);

  const active = team.filter((u) => !u.isDeleted);
  const countOf = (f: Filter) =>
    f === 'All' ? active.length
      : f === 'Removed' ? team.filter((u) => u.isDeleted).length
        : f === 'Suspended' ? active.filter((u) => u.status === 'Suspended' || u.status === 'Disabled').length
          : active.filter((u) => u.role === f).length;

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return team
      .filter((u) => {
        if (filter === 'Removed') return u.isDeleted;
        if (u.isDeleted) return false;
        if (filter === 'All') return true;
        if (filter === 'Suspended') return u.status === 'Suspended' || u.status === 'Disabled';
        return u.role === filter;
      })
      .filter((u) => !q || u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.phoneNumber ?? '').includes(q));
  }, [team, filter, search]);

  const isLocked = (u: User) => u.role === 'SuperAdmin' || !!u.isProtectedSuperAdmin || u.id === me?.id;
  const editingUser = editing ? team.find((u) => u.id === editing.id) ?? null : null;

  /** Runs an action, shows the result and reloads the list. Returns true when it worked. */
  async function run(u: User, action: () => Promise<unknown>, success: string) {
    setBusyId(u.id);
    setError(null);
    setToast(null);
    try {
      await action();
      setToast(success);
      await load();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      return false;
    } finally {
      setBusyId(null);
    }
  }

  const toggleStatus = (u: User) => {
    const activate = u.status !== 'Active';
    return run(u, () => usersApi.updateStatus(u.id, activate),
      activate ? `${u.fullName} can sign in again.` : `${u.fullName} is suspended and has been signed out.`);
  };
  const restore = (u: User) => run(u, () => usersApi.restore(u.id), `${u.fullName} has been restored.`);
  async function remove() {
    if (!confirmRemove) return;
    const u = confirmRemove;
    setConfirmRemove(null);
    setEditing(null);
    await run(u, () => usersApi.softDelete(u.id), `${u.fullName} has been removed. You can restore them from “Removed”.`);
  }

  if (loading) return <Spinner label="Loading the team…" />;

  return (
    <div className="page">
      <PageHeader
        title="Team"
        subtitle="Add your Admins, Staff and Teachers, edit their details and choose exactly what each person can open."
        actions={<button type="button" className="btn btn-primary" onClick={() => setAddOpen(true)}><Icon.UserPlus size={18} /> Add team member</button>}
      />

      {toast && <Alert tone="success" onClose={() => setToast(null)}>{toast}</Alert>}
      {error && <Alert tone="error" onClose={() => setError(null)}>{error}</Alert>}

      <div className="role-cards">
        {(['SuperAdmin', ...TEAM_ROLES] as const).map((r) => {
          const info = ROLE_INFO[r];
          const I = Icon[info.icon];
          const count = active.filter((u) => u.role === r).length;
          const body = (
            <>
              <div className="role-card-top">
                <span className={`stat-icon tone-${info.tone}`}><I size={19} /></span>
                <span className="role-card-count">{count}</span>
              </div>
              <strong>{roleLabel(r)}</strong>
              <p>{info.access}</p>
            </>
          );
          if (r === 'SuperAdmin') return <div key={r} className="role-card">{body}</div>;
          const on = filter === r;
          return (
            <button key={r} type="button" className={`role-card ${on ? 'active' : ''}`} onClick={() => setFilter(on ? 'All' : r)} aria-pressed={on}>
              {body}
            </button>
          );
        })}
      </div>

      <section className="card">
        <div className="card-head toolbar">
          <div className="chips">
            {(['All', ...TEAM_ROLES, 'Suspended', 'Removed'] as Filter[]).map((f) => (
              <button key={f} type="button" className={`chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                {f === 'All' ? 'Everyone' : isTeamRole(f) ? roleLabel(f) : f}
                <span className="count">{countOf(f)}</span>
              </button>
            ))}
          </div>
          <label className="search">
            <Icon.Search size={17} />
            <input className="input" type="search" placeholder="Search name, email or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
        </div>

        {visible.length === 0 ? (
          <EmptyState
            icon="Users"
            title={filter === 'Removed' ? 'No removed accounts' : search ? 'Nobody matches your search' : 'No team members here yet'}
            text={filter === 'Removed' || search ? undefined : 'Use “Add team member” to create the first account.'}
          />
        ) : (
          <div className="table-wrap">
            <table className="table table-cards team-table">
              <thead>
                <tr>
                  <th>Team member</th>
                  <th>Role</th>
                  <th>Access</th>
                  <th>Status</th>
                  <th>Last sign-in</th>
                  <th className="actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((u) => {
                  const locked = isLocked(u);
                  const busy = busyId === u.id;
                  const st = statusOf(u);
                  return (
                    <tr key={u.id} className={u.isDeleted ? 'is-dim' : ''}>
                      <td data-label="Team member">
                        <Person name={u.fullName} sub={<>{u.email}{u.phoneNumber && <span className="team-phone"> · {u.phoneNumber}</span>}</>} />
                      </td>
                      <td data-label="Role">
                        <span className={`badge badge-${u.role === 'SuperAdmin' ? 'gold' : 'blue'}`}>
                          {u.role === 'SuperAdmin' && <Icon.ShieldCheck size={13} />} {roleLabel(u.role)}
                        </span>
                      </td>
                      <td data-label="Access">
                        <AccessSummary user={u} roleDefaults={roleDefaults} />
                      </td>
                      <td data-label="Status"><span className={`badge badge-dot badge-${st.tone}`}>{st.label}</span></td>
                      <td data-label="Last sign-in">
                        <span className="muted small" title={u.lastLoginAtUtc ? formatDate(u.lastLoginAtUtc, true) : undefined}>
                          {u.lastLoginAtUtc ? timeAgo(u.lastLoginAtUtc) : 'Never'}
                        </span>
                      </td>
                      <td className="actions">
                        {locked ? (
                          <span className="muted small locked"><Icon.Lock size={14} /> Protected</span>
                        ) : u.isDeleted ? (
                          <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => void restore(u)}>
                            <Icon.Undo size={15} /> Restore
                          </button>
                        ) : (
                          <div className="row-end">
                            <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => setEditing({ id: u.id, tab: 'details' })}>
                              <Icon.Edit size={15} /> Edit
                            </button>
                            <button type="button" className="icon-btn sm" disabled={busy} onClick={() => setEditing({ id: u.id, tab: 'permissions' })} title="Permissions" aria-label={`Permissions for ${u.fullName}`}>
                              <Icon.Key size={15} />
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

      <AddMemberModal
        open={addOpen}
        roleDefaults={roleDefaults}
        onClose={() => setAddOpen(false)}
        onCreated={async (msg) => {
          setAddOpen(false);
          setError(null);
          setToast(msg);
          await load();
        }}
      />

      {editingUser && (
        <EditMemberDrawer
          key={editingUser.id}
          user={editingUser}
          initialTab={editing!.tab}
          roleDefaults={roleDefaults}
          onClose={() => setEditing(null)}
          onChanged={async (msg) => {
            setError(null);
            setToast(msg);
            await load();
          }}
          onToggleStatus={() => toggleStatus(editingUser)}
          onRemove={() => setConfirmRemove(editingUser)}
        />
      )}

      <Modal
        open={!!confirmRemove}
        onClose={() => setConfirmRemove(null)}
        title={`Remove ${confirmRemove?.fullName ?? ''}?`}
        subtitle="They are signed out at once and can no longer sign in. You can restore the account later."
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

// ── Access summary in the table ──────────────────────────────────────────────

function AccessSummary({ user, roleDefaults }: { user: User; roleDefaults: RoleDefaults }) {
  if (user.role === 'SuperAdmin') return <span className="muted small">Everything</span>;
  const access = accessOf(user, roleDefaults);
  const open = PERMISSION_MODULES.filter((m) => access[m.key] !== 'None');
  return (
    <div className="access-summary">
      <span className="access-icons">
        {open.map((m) => {
          const I = Icon[m.icon as IconName];
          return (
            <span key={m.key} className={`access-dot ${access[m.key] === 'View' ? 'is-view' : ''}`} title={`${m.label}: ${access[m.key] === 'View' ? 'view only' : 'full'}`}>
              <I size={13} />
            </span>
          );
        })}
      </span>
      {user.hasCustomPermissions && <span className="badge badge-purple" title="Access was customised for this person">Custom</span>}
    </div>
  );
}

// ── Permission matrix (used when adding and editing) ─────────────────────────

function PermissionMatrix({ role, value, roleDefaults, onChange, disabled }: {
  role: TeamRole;
  value: PermissionMap;
  roleDefaults: RoleDefaults;
  onChange: (next: PermissionMap) => void;
  disabled?: boolean;
}) {
  const defaults = roleDefaults[role];
  return (
    <div className="perm-matrix" role="table" aria-label="Permissions">
      {PERMISSION_MODULES.map((m) => {
        const I = Icon[m.icon as IconName];
        const current = value[m.key];
        const changed = defaults[m.key] !== current;
        return (
          <div className="perm-row" role="row" key={m.key}>
            <div className="perm-area" role="cell">
              <span className="perm-icon"><I size={17} /></span>
              <span>
                <strong>
                  {m.label}
                  {changed && <span className="perm-changed" title={`${roleLabel(role)} default: ${LEVELS.find((x) => x.value === defaults[m.key])?.label}`}>changed</span>}
                </strong>
                <small>{current === 'Full' ? m.full : current === 'View' ? m.view : 'Hidden from this person'}</small>
              </span>
            </div>
            <div className="seg" role="radiogroup" aria-label={`${m.label} access`}>
              {LEVELS.map((l) => {
                const isRoleDefault = defaults[m.key] === l.value;
                return (
                  <button
                    key={l.value}
                    type="button"
                    role="radio"
                    aria-checked={current === l.value}
                    className={`seg-btn level-${l.value.toLowerCase()} ${current === l.value ? 'active' : ''}`}
                    disabled={disabled}
                    title={isRoleDefault ? `Normal for a ${roleLabel(role)}` : undefined}
                    onClick={() => onChange({ ...value, [m.key]: l.value })}
                  >
                    {l.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PasswordField({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  const [show, setShow] = useState(true);
  const [copied, setCopied] = useState(false);
  return (
    <div className="pw-row">
      <input id={id} type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} minLength={8} required autoComplete="new-password" />
      <button type="button" className="icon-btn" onClick={() => setShow((v) => !v)} title={show ? 'Hide' : 'Show'} aria-label={show ? 'Hide password' : 'Show password'}>
        {show ? <Icon.EyeOff size={17} /> : <Icon.Eye size={17} />}
      </button>
      <button type="button" className="icon-btn" onClick={() => onChange(makePassword())} title="Generate a new password" aria-label="Generate a new password">
        <Icon.Refresh size={17} />
      </button>
      <button
        type="button"
        className="icon-btn"
        onClick={() => {
          void navigator.clipboard?.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        title={copied ? 'Copied' : 'Copy'}
        aria-label="Copy password"
      >
        {copied ? <Icon.Check size={17} /> : <Icon.Copy size={17} />}
      </button>
    </div>
  );
}

function RolePicker({ value, onChange, disabled }: { value: TeamRole; onChange: (r: TeamRole) => void; disabled?: boolean }) {
  return (
    <div className="role-picker" role="radiogroup" aria-label="Role">
      {TEAM_ROLES.map((r) => {
        const I = Icon[ROLE_INFO[r].icon];
        return (
          <button key={r} type="button" role="radio" aria-checked={value === r} disabled={disabled} className={`audience ${value === r ? 'active' : ''}`} onClick={() => onChange(r)}>
            <I size={18} />
            <span>
              <strong>{roleLabel(r)}</strong>
              <small>{ROLE_INFO[r].access}</small>
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Add a team member ────────────────────────────────────────────────────────

function AddMemberModal({ open, roleDefaults, onClose, onCreated }: {
  open: boolean;
  roleDefaults: RoleDefaults;
  onClose: () => void;
  onCreated: (message: string) => Promise<void>;
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<TeamRole>('Mentor');
  const [password, setPassword] = useState(makePassword);
  const [customise, setCustomise] = useState(false);
  const [perms, setPerms] = useState<PermissionMap>(roleDefaults.Mentor);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setRole('Mentor');
    setPassword(makePassword());
    setCustomise(false);
    setPerms(roleDefaults.Mentor);
    setFormError(null);
  }, [open, roleDefaults]);

  function pickRole(r: TeamRole) {
    setRole(r);
    setPerms(roleDefaults[r]);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const custom = customise && !sameMap(perms, roleDefaults[role]) ? perms : null;
      await usersApi.create({
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phone.trim() || undefined,
        role,
        password,
        permissions: custom,
      });
      await onCreated(`${roleLabel(role)} account created for ${firstName.trim()} ${lastName.trim()}. We emailed them the sign-in details — you can also share the temporary password privately.`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not create the account.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title="Add a team member"
      subtitle="They sign in to this console with their email and the temporary password below."
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" form="add-member-form" className="btn btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create account'}</button>
        </>
      }
    >
      <form id="add-member-form" onSubmit={submit}>
        {formError && <div style={{ marginBottom: 14 }}><Alert tone="error">{formError}</Alert></div>}
        <div className="grid-2">
          <div className="field">
            <label htmlFor="a-first">First name</label>
            <input id="a-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="e.g. Matteo" required maxLength={60} />
          </div>
          <div className="field">
            <label htmlFor="a-last">Last name</label>
            <input id="a-last" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="e.g. Ricci" required maxLength={60} />
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="a-email">Work email</label>
            <input id="a-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@sseuropa.com" required />
          </div>
          <div className="field">
            <label htmlFor="a-phone">Phone <span className="muted">(optional)</span></label>
            <input id="a-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+39 333 123 4567" />
          </div>
        </div>

        <div className="label" style={{ marginBottom: 8 }}>Role</div>
        <RolePicker value={role} onChange={pickRole} />

        <div className="perm-toggle">
          <label className="check-row">
            <input type="checkbox" checked={customise} onChange={(e) => { setCustomise(e.target.checked); if (!e.target.checked) setPerms(roleDefaults[role]); }} />
            <span>
              <strong>Customise what they can open</strong>
              <small>Leave this off to give the normal {roleLabel(role)} access. Any role can be given any area.</small>
            </span>
          </label>
        </div>
        {customise && <PermissionMatrix role={role} value={perms} roleDefaults={roleDefaults} onChange={setPerms} />}

        <div className="field" style={{ marginTop: 16, marginBottom: 0 }}>
          <label htmlFor="a-pass">Temporary password</label>
          <PasswordField id="a-pass" value={password} onChange={setPassword} />
          <span className="hint">At least 8 characters. It is emailed to them; if you share it yourself, do it privately and ask them to change it after signing in.</span>
        </div>
      </form>
    </Modal>
  );
}

// ── Edit a team member (drawer with tabs) ────────────────────────────────────

function EditMemberDrawer({ user, initialTab, roleDefaults, onClose, onChanged, onToggleStatus, onRemove }: {
  user: User;
  initialTab: Tab;
  roleDefaults: RoleDefaults;
  onClose: () => void;
  onChanged: (message: string) => Promise<void>;
  onToggleStatus: () => Promise<boolean>;
  onRemove: () => void;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const role = isTeamRole(user.role) ? user.role : 'Mentor';
  const st = statusOf(user);

  return (
    <Modal
      open
      drawer
      onClose={onClose}
      title={user.fullName}
      subtitle={<span className="drawer-sub"><span className="badge badge-blue">{roleLabel(user.role)}</span> <span className={`badge badge-dot badge-${st.tone}`}>{st.label}</span> {user.email}</span>}
    >
      <div className="tabs" role="tablist">
        {([['details', 'Details', 'Edit'], ['permissions', 'Permissions', 'Key'], ['security', 'Security', 'Lock']] as const).map(([k, label, icon]) => {
          const I = Icon[icon];
          return (
            <button key={k} type="button" role="tab" aria-selected={tab === k} className={`tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>
              <I size={15} /> {label}
            </button>
          );
        })}
      </div>

      {tab === 'details' && <DetailsTab user={user} role={role} onChanged={onChanged} />}
      {tab === 'permissions' && <PermissionsTab user={user} role={role} roleDefaults={roleDefaults} onChanged={onChanged} />}
      {tab === 'security' && <SecurityTab user={user} onChanged={onChanged} onToggleStatus={onToggleStatus} onRemove={onRemove} />}
    </Modal>
  );
}

function DetailsTab({ user, role, onChanged }: { user: User; role: TeamRole; onChanged: (m: string) => Promise<void> }) {
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phoneNumber ?? '');
  const [newRole, setNewRole] = useState<TeamRole>(role);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const detailsChanged = firstName.trim() !== user.firstName || lastName.trim() !== user.lastName
    || email.trim().toLowerCase() !== user.email.toLowerCase() || phone.trim() !== (user.phoneNumber ?? '');
  const roleChanged = newRole !== role;

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      if (detailsChanged) {
        await usersApi.updateDetails(user.id, { firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), phoneNumber: phone.trim() || null });
      }
      if (roleChanged) await usersApi.updateRole(user.id, newRole);
      await onChanged(roleChanged
        ? `${firstName.trim()} is now ${roleLabel(newRole)}. Their permissions were reset to the ${roleLabel(newRole)} defaults and they need to sign in again.`
        : `Details saved for ${firstName.trim()} ${lastName.trim()}.`);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="drawer-section">
      {err && <div style={{ marginBottom: 14 }}><Alert tone="error">{err}</Alert></div>}
      <div className="grid-2">
        <div className="field">
          <label htmlFor="e-first">First name</label>
          <input id="e-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} required maxLength={60} />
        </div>
        <div className="field">
          <label htmlFor="e-last">Last name</label>
          <input id="e-last" value={lastName} onChange={(e) => setLastName(e.target.value)} required maxLength={60} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="e-email">Work email</label>
        <input id="e-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <span className="hint">They sign in with this email.</span>
      </div>
      <div className="field">
        <label htmlFor="e-phone">Phone <span className="muted">(optional)</span></label>
        <input id="e-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+39 333 123 4567" />
      </div>

      <div className="label" style={{ marginBottom: 8 }}>Role</div>
      <RolePicker value={newRole} onChange={setNewRole} disabled={saving} />
      {roleChanged && (
        <div style={{ marginTop: 12 }}>
          <Alert tone="warn">Changing the role resets their permissions to the {roleLabel(newRole)} defaults and signs them out, so they sign in again with the new role.</Alert>
        </div>
      )}

      <div className="drawer-actions">
        <button type="submit" className="btn btn-primary" disabled={saving || (!detailsChanged && !roleChanged)}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}

function PermissionsTab({ user, role, roleDefaults, onChanged }: { user: User; role: TeamRole; roleDefaults: RoleDefaults; onChanged: (m: string) => Promise<void> }) {
  const saved = accessOf(user, roleDefaults);
  const [perms, setPerms] = useState<PermissionMap>(saved);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const defaults = roleDefaults[role];
  const dirty = !sameMap(perms, saved);
  const isDefault = sameMap(perms, defaults);

  async function save(reset = false) {
    setSaving(true);
    setErr(null);
    try {
      const next = reset || isDefault ? null : perms;
      await usersApi.updatePermissions(user.id, next);
      if (reset) setPerms(defaults);
      await onChanged(next ? `Permissions saved for ${user.fullName}. They apply straight away.` : `${user.fullName} is back to the normal ${roleLabel(role)} access.`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save permissions.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="drawer-section">
      <p className="muted small perm-intro">
        <strong>No access</strong> hides the page. <strong>View</strong> lets them look but not change anything. <strong>Full</strong> lets them make changes.
        Every area can be set for any role. The role only gives the starting point; areas you change from it are marked “changed”. Changes apply straight away — no need for them to sign in again.
      </p>
      {err && <div style={{ marginBottom: 14 }}><Alert tone="error">{err}</Alert></div>}
      <PermissionMatrix role={role} value={perms} roleDefaults={roleDefaults} onChange={setPerms} disabled={saving} />
      <div className="drawer-actions">
        <button type="button" className="btn btn-ghost" disabled={saving || (!user.hasCustomPermissions && isDefault)} onClick={() => void save(true)}>
          <Icon.Undo size={15} /> Reset to {roleLabel(role)} defaults
        </button>
        <button type="button" className="btn btn-primary" disabled={saving || !dirty} onClick={() => void save()}>
          {saving ? 'Saving…' : 'Save permissions'}
        </button>
      </div>
    </div>
  );
}

function SecurityTab({ user, onChanged, onToggleStatus, onRemove }: {
  user: User;
  onChanged: (m: string) => Promise<void>;
  onToggleStatus: () => Promise<boolean>;
  onRemove: () => void;
}) {
  const [password, setPassword] = useState(makePassword);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [issued, setIssued] = useState<string | null>(null);
  const active = user.status === 'Active';

  async function reset() {
    setBusy(true);
    setErr(null);
    try {
      const res = await usersApi.resetPassword(user.id, password);
      setIssued(res.temporaryPassword);
      await onChanged(`New password set for ${user.fullName}. They were signed out everywhere and the password was emailed to them.`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not reset the password.');
    } finally {
      setBusy(false);
    }
  }

  async function toggle() {
    setBusy(true);
    await onToggleStatus();
    setBusy(false);
  }

  return (
    <div className="drawer-section">
      {err && <div style={{ marginBottom: 14 }}><Alert tone="error">{err}</Alert></div>}

      <dl className="facts">
        <div><dt>Account created</dt><dd>{user.createdAtUtc ? formatDate(user.createdAtUtc) : '—'}</dd></div>
        <div><dt>Last sign-in</dt><dd>{user.lastLoginAtUtc ? `${formatDate(user.lastLoginAtUtc, true)} (${timeAgo(user.lastLoginAtUtc)})` : 'Never signed in'}</dd></div>
      </dl>

      <div className="sec-block">
        <h3><Icon.Key size={16} /> Reset password</h3>
        <p className="muted small">Sets a new temporary password, emails it to them and signs them out of every device.</p>
        {issued ? (
          <Alert tone="success">
            New password: <code className="pw-code">{issued}</code>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => void navigator.clipboard?.writeText(issued)}><Icon.Copy size={14} /> Copy</button>
          </Alert>
        ) : (
          <>
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="s-pass">New temporary password</label>
              <PasswordField id="s-pass" value={password} onChange={setPassword} />
            </div>
            <div className="drawer-actions">
              <button type="button" className="btn btn-primary" disabled={busy || password.length < 8} onClick={() => void reset()}>
                {busy ? 'Working…' : 'Set new password'}
              </button>
            </div>
          </>
        )}
      </div>

      <div className="sec-block">
        <h3>{active ? <Icon.Pause size={16} /> : <Icon.CheckCircle size={16} />} {active ? 'Suspend account' : 'Activate account'}</h3>
        <p className="muted small">
          {active ? 'They are signed out at once and can’t sign in until you activate them again. Nothing is deleted.' : 'Lets them sign in again with their current password.'}
        </p>
        <div className="drawer-actions">
          <button type="button" className={`btn ${active ? 'btn-secondary' : 'btn-primary'}`} disabled={busy} onClick={() => void toggle()}>
            {active ? 'Suspend' : 'Activate'}
          </button>
        </div>
      </div>

      <div className="sec-block danger-zone">
        <h3><Icon.Trash size={16} /> Remove account</h3>
        <p className="muted small">Removes them from the team. You can restore the account later from “Removed”.</p>
        <div className="drawer-actions">
          <button type="button" className="btn btn-danger" disabled={busy} onClick={onRemove}>Remove {user.firstName}</button>
        </div>
      </div>
    </div>
  );
}
