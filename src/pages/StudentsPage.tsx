import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { Alert, EmptyState, Modal, PageHeader, Person, Spinner, StatCard, formatDate, timeAgo } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { batchesApi, studentsApi } from '../services/platformApi';
import type { Batch, Student, StudentPasswordResult } from '../types';
import './pages.css';
import './students.css';

/**
 * Students — every student account: people who signed up themselves and people the team added.
 * Admin and Staff add students (login details go out by email) and place them in a batch.
 * Teachers see the students of the batches they lead (read-only).
 */

const LANGUAGES = [
  { id: 'English', label: 'English' },
  { id: 'Punjabi', label: 'Punjabi' },
  { id: 'Hindi', label: 'Hindi' },
  { id: 'Urdu', label: 'Urdu' },
];

const NO_BATCH = 'none';

type StatusFilter = 'all' | 'active' | 'suspended' | 'unverified';
type SourceFilter = 'all' | 'signup' | 'team';

function statusOf(s: Student): { label: string; tone: string } {
  if (s.isDeleted) return { label: 'Removed', tone: 'gray' };
  if (s.status === 'Suspended' || s.status === 'Disabled') return { label: 'Suspended', tone: 'red' };
  if (s.status === 'PendingVerification' || !s.emailVerified) return { label: 'Email not verified', tone: 'orange' };
  return { label: 'Active', tone: 'green' };
}

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  batchId: string;
  preferredLanguage: string;
}

const emptyForm = (batchId = ''): FormState => ({ firstName: '', lastName: '', email: '', phoneNumber: '', batchId, preferredLanguage: 'English' });

export function StudentsPage() {
  const { hasRole } = useAuth();
  const canManage = hasRole('SuperAdmin', 'Admin', 'Staff');
  const [params, setParams] = useSearchParams();

  const [students, setStudents] = useState<Student[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const batchFilter = params.get('batch') ?? 'all';
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [moveTo, setMoveTo] = useState('');
  const [moving, setMoving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [confirmReset, setConfirmReset] = useState<Student | null>(null);
  const [passwordResult, setPasswordResult] = useState<{ result: StudentPasswordResult; isReset: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  async function load() {
    try {
      const [s, b] = await Promise.all([studentsApi.list(), batchesApi.list()]);
      setStudents(s);
      setBatches(b);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load students.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const current = useMemo(() => students.filter((s) => !s.isDeleted), [students]);
  const withoutBatch = current.filter((s) => !s.batchId).length;
  const newThisWeek = current.filter((s) => Date.now() - new Date(s.createdAtUtc).getTime() < 7 * 86400_000).length;
  const tempPassword = current.filter((s) => s.mustChangePassword).length;

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return current
      .filter((s) => (batchFilter === 'all' ? true : batchFilter === NO_BATCH ? !s.batchId : s.batchId === batchFilter))
      .filter((s) => {
        const st = statusOf(s).label;
        if (statusFilter === 'active') return st === 'Active';
        if (statusFilter === 'suspended') return st === 'Suspended';
        if (statusFilter === 'unverified') return st === 'Email not verified';
        return true;
      })
      .filter((s) => (sourceFilter === 'all' ? true : sourceFilter === 'team' ? s.addedByStaff : !s.addedByStaff))
      .filter((s) => !q || s.fullName.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || (s.phoneNumber ?? '').replace(/\s/g, '').includes(q.replace(/\s/g, '')));
  }, [current, search, batchFilter, statusFilter, sourceFilter]);

  const filtersOn = batchFilter !== 'all' || statusFilter !== 'all' || sourceFilter !== 'all' || search.trim() !== '';
  const allVisibleSelected = visible.length > 0 && visible.every((s) => selected.has(s.id));

  function setBatchFilter(value: string) {
    const next = new URLSearchParams(params);
    if (value === 'all') next.delete('batch');
    else next.set('batch', value);
    setParams(next, { replace: true });
  }

  function clearFilters() {
    setSearch('');
    setStatusFilter('all');
    setSourceFilter('all');
    setBatchFilter('all');
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      if (allVisibleSelected) {
        const next = new Set(prev);
        visible.forEach((s) => next.delete(s.id));
        return next;
      }
      return new Set([...prev, ...visible.map((s) => s.id)]);
    });
  }

  async function moveSelected() {
    if (selected.size === 0 || !moveTo) return;
    setMoving(true);
    setError(null);
    try {
      const target = moveTo === NO_BATCH ? null : moveTo;
      const res = await studentsApi.move([...selected], target);
      setToast(target ? `${res.moved} student${res.moved === 1 ? '' : 's'} moved to ${res.batchName}. Their batch courses are open now.` : `${res.moved} student${res.moved === 1 ? '' : 's'} taken out of their batch.`);
      setSelected(new Set());
      setMoveTo('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not move the students.');
    } finally {
      setMoving(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm(batchFilter !== 'all' && batchFilter !== NO_BATCH ? batchFilter : ''));
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(s: Student) {
    setEditing(s);
    setForm({
      firstName: s.firstName,
      lastName: s.lastName,
      email: s.email,
      phoneNumber: s.phoneNumber ?? '',
      batchId: s.batchId ?? '',
      preferredLanguage: s.preferredLanguage,
    });
    setFormError(null);
    setFormOpen(true);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const body = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phoneNumber: form.phoneNumber.trim() || undefined,
        batchId: form.batchId || null,
        preferredLanguage: form.preferredLanguage,
      };
      if (editing) {
        await studentsApi.update(editing.id, body);
        setToast(`${body.firstName} ${body.lastName}`.trim() + ' has been updated.');
      } else {
        const result = await studentsApi.create({ ...body, email: form.email.trim() });
        setPasswordResult({ result, isReset: false });
        setCopied(false);
      }
      setFormOpen(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save the student.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(s: Student) {
    const activate = statusOf(s).label === 'Suspended';
    setBusyId(s.id);
    setError(null);
    try {
      await studentsApi.setStatus(s.id, activate);
      setToast(`${s.fullName} is now ${activate ? 'active' : 'suspended and cannot sign in'}.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not change the status.');
    } finally {
      setBusyId(null);
    }
  }

  async function resetPassword() {
    if (!confirmReset) return;
    const s = confirmReset;
    setConfirmReset(null);
    setBusyId(s.id);
    setError(null);
    try {
      const result = await studentsApi.resetPassword(s.id);
      setPasswordResult({ result, isReset: true });
      setCopied(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reset the password.');
    } finally {
      setBusyId(null);
    }
  }

  async function copyDetails() {
    if (!passwordResult) return;
    const { student, temporaryPassword } = passwordResult.result;
    const text = `SS Europa student login\nEmail: ${student.email}\nTemporary password: ${temporaryPassword}\nSign in: https://student.sseuropa.com/login\nYou will choose your own password after signing in.`;
    try {
      await navigator.clipboard?.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  if (loading) return <Spinner label="Loading students…" />;

  const batchName = (id: string) => batches.find((b) => b.id === id)?.name;

  return (
    <div className="page">
      <PageHeader
        title="Students"
        subtitle={canManage
          ? 'Everyone who signed up or was added by the team. Place each student in a batch: the batch decides which courses they can open.'
          : 'Students in the batches you teach.'}
        actions={canManage && (
          <button type="button" className="btn btn-primary" onClick={openCreate}><Icon.UserPlus size={18} /> Add student</button>
        )}
      />

      {toast && <Alert tone="success" onClose={() => setToast(null)}>{toast}</Alert>}
      {error && <Alert tone="error" onClose={() => setError(null)}>{error}</Alert>}

      <div className="stats">
        <StatCard icon="Users" label="Students" value={current.length} tone="blue" />
        <StatCard icon="Alert" label="Not in a batch yet" value={withoutBatch} tone={withoutBatch > 0 ? 'orange' : 'green'} hint={withoutBatch > 0 ? 'They can only open courses open to all' : 'Everyone is placed'} />
        <StatCard icon="Trend" label="New this week" value={newThisWeek} tone="teal" />
        <StatCard icon="Key" label="Using a temporary password" value={tempPassword} tone="purple" hint="Haven't signed in and changed it yet" />
      </div>

      <section className="card">
        <div className="card-head toolbar st-toolbar">
          <label className="search">
            <Icon.Search size={17} />
            <input className="input" type="search" placeholder="Search name, email or phone…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search students" />
          </label>
          <div className="st-filters">
            <select className="select input-sm" value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)} aria-label="Filter by batch">
              <option value="all">All batches</option>
              <option value={NO_BATCH}>Not in a batch ({withoutBatch})</option>
              {batches.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.studentCount})</option>)}
            </select>
            <select className="select input-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} aria-label="Filter by status">
              <option value="all">Any status</option>
              <option value="active">Active</option>
              <option value="unverified">Email not verified</option>
              <option value="suspended">Suspended</option>
            </select>
            <select className="select input-sm" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value as SourceFilter)} aria-label="Filter by how they joined">
              <option value="all">Signed up + added by team</option>
              <option value="signup">Signed up themselves</option>
              <option value="team">Added by the team</option>
            </select>
            {filtersOn && <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}><Icon.X size={15} /> Clear</button>}
          </div>
        </div>

        {canManage && selected.size > 0 && (
          <div className="st-bulk" role="region" aria-label="Selected students">
            <strong>{selected.size} selected</strong>
            <select className="select input-sm" value={moveTo} onChange={(e) => setMoveTo(e.target.value)} aria-label="Move to batch">
              <option value="">Move to batch…</option>
              {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              <option value={NO_BATCH}>— Take out of batch —</option>
            </select>
            <button type="button" className="btn btn-primary btn-sm" disabled={!moveTo || moving} onClick={() => void moveSelected()}>
              {moving ? 'Moving…' : 'Move'}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelected(new Set())}>Cancel</button>
          </div>
        )}

        {visible.length === 0 ? (
          <EmptyState
            icon="Users"
            title={current.length === 0 ? 'No students yet' : 'No students match these filters'}
            text={current.length === 0
              ? (canManage ? 'Students appear here when they sign up, or use “Add student”.' : 'When an Admin places students in your batch, they appear here.')
              : undefined}
            action={filtersOn ? <button type="button" className="btn btn-secondary btn-sm" onClick={clearFilters}>Clear filters</button> : undefined}
          />
        ) : (
          <div className="table-wrap">
            <table className="table table-cards st-table">
              <thead>
                <tr>
                  {canManage && (
                    <th className="st-check">
                      <input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} aria-label="Select all shown students" />
                    </th>
                  )}
                  <th>Student</th>
                  <th>Batch</th>
                  <th>Courses</th>
                  <th>Joined</th>
                  <th>Status</th>
                  {canManage && <th className="actions">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {visible.map((s) => {
                  const st = statusOf(s);
                  const busy = busyId === s.id;
                  return (
                    <tr key={s.id} className={selected.has(s.id) ? 'is-selected' : ''}>
                      {canManage && (
                        <td className="st-check">
                          <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} aria-label={`Select ${s.fullName}`} />
                        </td>
                      )}
                      <td data-label="Student">
                        <Person name={s.fullName || s.email} sub={s.email} />
                        {s.phoneNumber && <span className="st-phone"><Icon.Phone size={12} /> {s.phoneNumber}</span>}
                      </td>
                      <td data-label="Batch">
                        {s.batchId ? (
                          <button type="button" className="link-btn" onClick={() => setBatchFilter(s.batchId!)}>
                            <span className="badge badge-blue">{s.batchName ?? batchName(s.batchId) ?? 'Batch'}</span>
                          </button>
                        ) : (
                          <span className="badge badge-orange">No batch</span>
                        )}
                      </td>
                      <td data-label="Courses">
                        <span className="st-progress" title={`${s.progressPercent}% average progress`}>
                          <span>{s.activeCourses}</span>
                          <span className="st-bar" aria-hidden><span style={{ width: `${s.progressPercent}%` }} /></span>
                          <span className="muted small">{s.progressPercent}%</span>
                        </span>
                      </td>
                      <td data-label="Joined">
                        <span className="st-joined">
                          <span>{formatDate(s.createdAtUtc)} <span className="muted xs">· {s.addedByStaff ? 'added by team' : 'signed up'}</span></span>
                          <span className="muted xs">Last sign-in: {s.lastLoginAtUtc ? timeAgo(s.lastLoginAtUtc) : 'never'}</span>
                        </span>
                      </td>
                      <td data-label="Status">
                        <span className="st-status">
                          <span className={`badge badge-dot badge-${st.tone}`}>{st.label}</span>
                          {s.mustChangePassword && <span className="badge badge-purple st-temp" title="Still using the temporary password from the email"><Icon.Key size={12} /> Temp password</span>}
                        </span>
                      </td>
                      {canManage && (
                        <td className="actions">
                          <div className="row-end">
                            <button type="button" className="icon-btn sm" disabled={busy} onClick={() => openEdit(s)} title="Edit / change batch" aria-label={`Edit ${s.fullName}`}>
                              <Icon.Edit size={15} />
                            </button>
                            <button type="button" className="icon-btn sm" disabled={busy} onClick={() => setConfirmReset(s)} title="Email a new temporary password" aria-label={`Reset password for ${s.fullName}`}>
                              <Icon.Key size={15} />
                            </button>
                            <button type="button" className={`icon-btn sm ${st.label === 'Suspended' ? '' : 'danger'}`} disabled={busy} onClick={() => void toggleStatus(s)} title={st.label === 'Suspended' ? 'Activate' : 'Suspend (cannot sign in)'} aria-label={`${st.label === 'Suspended' ? 'Activate' : 'Suspend'} ${s.fullName}`}>
                              {st.label === 'Suspended' ? <Icon.CheckCircle size={15} /> : <Icon.Pause size={15} />}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {visible.length > 0 && (
          <div className="card-foot st-foot muted small">
            Showing {visible.length} of {current.length} students
            {batches.length === 0 && canManage && <> · <Link to="/app/batches">Create your first batch</Link> to group students</>}
          </div>
        )}
      </section>

      {/* ── Add / edit student ── */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? `Edit ${editing.fullName}` : 'Add a student'}
        subtitle={editing ? 'Changing the batch opens the new batch’s courses and closes the old ones. Progress is kept.' : 'We email the student their login details with a temporary password. They choose their own password at first sign-in.'}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</button>
            <button type="submit" form="student-form" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : <><Icon.Send size={16} /> Create & email login</>}
            </button>
          </>
        }
      >
        <form id="student-form" onSubmit={save}>
          {formError && <div style={{ marginBottom: 14 }}><Alert tone="error">{formError}</Alert></div>}
          <div className="grid-2">
            <div className="field">
              <label htmlFor="s-first">First name</label>
              <input id="s-first" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} placeholder="e.g. Gurpreet" required />
            </div>
            <div className="field">
              <label htmlFor="s-last">Last name</label>
              <input id="s-last" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} placeholder="e.g. Singh" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="s-email">Email</label>
            <input id="s-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="student@example.com" required disabled={!!editing} />
            {editing && <span className="hint">The email is the student’s login and can’t be changed here.</span>}
          </div>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="s-phone">Phone / WhatsApp <span className="muted">(optional)</span></label>
              <input id="s-phone" type="tel" value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} placeholder="+91 98…" />
            </div>
            <div className="field">
              <label htmlFor="s-lang">App language</label>
              <select id="s-lang" className="select" value={form.preferredLanguage} onChange={(e) => setForm({ ...form, preferredLanguage: e.target.value })}>
                {LANGUAGES.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
              </select>
            </div>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="s-batch">Batch</label>
            <select id="s-batch" className="select" value={form.batchId} onChange={(e) => setForm({ ...form, batchId: e.target.value })}>
              <option value="">Not in a batch yet</option>
              {batches.map((b) => <option key={b.id} value={b.id}>{b.name} · {b.level} · {b.courses.length} course{b.courses.length === 1 ? '' : 's'}</option>)}
            </select>
            <span className="hint">
              {form.batchId
                ? <>Opens: {batches.find((b) => b.id === form.batchId)?.courses.map((c) => c.title).join(', ') || 'no courses assigned to this batch yet'}</>
                : 'Without a batch the student only sees courses marked “open to every student”.'}
            </span>
          </div>
        </form>
      </Modal>

      {/* ── Confirm password reset ── */}
      <Modal
        open={!!confirmReset}
        onClose={() => setConfirmReset(null)}
        title="Email a new temporary password?"
        subtitle="Their current password stops working. They will choose a new one after signing in."
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setConfirmReset(null)}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={() => void resetPassword()}><Icon.Send size={16} /> Reset & email</button>
          </>
        }
      >
        {confirmReset && <Person name={confirmReset.fullName} sub={confirmReset.email} size="lg" />}
      </Modal>

      {/* ── Login details (shown once) ── */}
      <Modal
        open={!!passwordResult}
        onClose={() => setPasswordResult(null)}
        title={passwordResult?.isReset ? 'New password sent' : 'Student added'}
        subtitle={passwordResult ? `We emailed the login details to ${passwordResult.result.student.email}.` : undefined}
        footer={<button type="button" className="btn btn-primary" onClick={() => setPasswordResult(null)}>Done</button>}
      >
        {passwordResult && (
          <div className="st-login">
            <Person name={passwordResult.result.student.fullName} sub={passwordResult.result.student.batchName ? `Batch: ${passwordResult.result.student.batchName}` : 'Not in a batch yet'} size="lg" />
            <dl className="st-creds">
              <dt>Email</dt>
              <dd>{passwordResult.result.student.email}</dd>
              <dt>Temporary password</dt>
              <dd><code>{passwordResult.result.temporaryPassword}</code></dd>
            </dl>
            <button type="button" className="btn btn-secondary" onClick={() => void copyDetails()}>
              {copied ? <><Icon.Check size={16} /> Copied</> : <><Icon.Copy size={16} /> Copy login details</>}
            </button>
            <p className="muted small" style={{ margin: 0 }}>
              If the email doesn’t arrive, share these details with the student privately (e.g. WhatsApp). This password is shown only now.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
