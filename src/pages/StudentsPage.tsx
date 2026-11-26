import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { Alert, EmptyState, Modal, PageHeader, Person, Spinner, StatCard, formatDate, timeAgo } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { batchTiming } from '../lib/status';
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

type Tab = 'all' | 'new' | 'payment' | 'active' | 'suspended';
type SourceFilter = 'all' | 'signup' | 'team';

const TABS: { id: Tab; label: string; hint: string }[] = [
  { id: 'all', label: 'All', hint: '' },
  { id: 'new', label: 'New (paid)', hint: 'Paid enquiries. Choose a batch and send the login.' },
  { id: 'payment', label: 'Payment pending', hint: 'Signed up themselves but not in a batch, so no lessons open. Call them to take the payment.' },
  { id: 'active', label: 'Active', hint: '' },
  { id: 'suspended', label: 'Suspended', hint: '' },
];

/** Which tab a student belongs to. */
function stageOf(s: Student): Exclude<Tab, 'all'> {
  if (s.status === 'Suspended' || s.status === 'Disabled') return 'suspended';
  if (s.awaitingLogin) return 'new';
  if (!s.addedByStaff && batchIdsOf(s).length === 0) return 'payment';
  return 'active';
}

const digits = (phone: string) => phone.replace(/[^\d]/g, '');

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
  batchIds: string[];
  preferredLanguage: string;
}

const emptyForm = (batchId = ''): FormState => ({ firstName: '', lastName: '', email: '', phoneNumber: '', batchIds: batchId ? [batchId] : [], preferredLanguage: 'English' });

/** Every batch of a student (older records only have batchId). */
const batchIdsOf = (s: Student) => (s.batches?.length ? s.batches.map((b) => b.id) : s.batchId ? [s.batchId] : []);

export function StudentsPage() {
  const { can } = useAuth();
  const canManage = can('students', 'Full');
  /** View access is enough to send the login of a paid student (Teachers). */
  const canSendLogin = can('students', 'View');
  const [params, setParams] = useSearchParams();

  const [students, setStudents] = useState<Student[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const batchFilter = params.get('batch') ?? 'all';
  const tabParam = params.get('tab') as Tab | null;
  const tab: Tab = tabParam && TABS.some((t) => t.id === tabParam) ? tabParam : 'all';
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [moveTo, setMoveTo] = useState('');
  const [moveMode, setMoveMode] = useState<'add' | 'replace' | 'remove'>('add');
  const [moving, setMoving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [access, setAccess] = useState<Student | null>(null);
  const [accessBatches, setAccessBatches] = useState<string[]>([]);
  const [accessError, setAccessError] = useState<string | null>(null);

  const [confirmReset, setConfirmReset] = useState<Student | null>(null);
  const [passwordResult, setPasswordResult] = useState<{ result: StudentPasswordResult; isReset: boolean; loginSent?: boolean } | null>(null);
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
  const withoutBatch = current.filter((s) => batchIdsOf(s).length === 0).length;
  const tempPassword = current.filter((s) => s.mustChangePassword && !s.awaitingLogin).length;
  const tabCounts = useMemo(() => {
    const c: Record<Tab, number> = { all: current.length, new: 0, payment: 0, active: 0, suspended: 0 };
    current.forEach((s) => c[stageOf(s)]++);
    return c;
  }, [current]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return current
      .filter((s) => (batchFilter === 'all' ? true : batchFilter === NO_BATCH ? batchIdsOf(s).length === 0 : batchIdsOf(s).includes(batchFilter)))
      .filter((s) => tab === 'all' || stageOf(s) === tab)
      .filter((s) => (sourceFilter === 'all' ? true : sourceFilter === 'team' ? s.addedByStaff : !s.addedByStaff))
      .filter((s) => !q || s.fullName.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || (s.phoneNumber ?? '').replace(/\s/g, '').includes(q.replace(/\s/g, '')));
  }, [current, search, batchFilter, tab, sourceFilter]);

  const filtersOn = batchFilter !== 'all' || sourceFilter !== 'all' || search.trim() !== '';
  /** Students waiting for payment or their login can't be selected for bulk batch changes. */
  const selectable = visible.filter((s) => stageOf(s) !== 'new' && stageOf(s) !== 'payment');
  const allVisibleSelected = selectable.length > 0 && selectable.every((s) => selected.has(s.id));

  function setBatchFilter(value: string) {
    const next = new URLSearchParams(params);
    if (value === 'all') next.delete('batch');
    else next.set('batch', value);
    setParams(next, { replace: true });
  }

  function setTab(value: Tab) {
    const next = new URLSearchParams(params);
    if (value === 'all') next.delete('tab');
    else next.set('tab', value);
    setParams(next, { replace: true });
  }

  function clearFilters() {
    setSearch('');
    setSourceFilter('all');
    setBatchFilter('all');
  }

  function openAccess(s: Student) {
    setAccess(s);
    setAccessBatches(batchIdsOf(s));
    setAccessError(null);
  }

  async function giveAccess() {
    if (!access) return;
    const s = access;
    setBusyId(s.id);
    setAccessError(null);
    try {
      const res = await studentsApi.giveAccess(s.id, accessBatches);
      setAccess(null);
      if (res.temporaryPassword) {
        setPasswordResult({ result: { student: res.student, temporaryPassword: res.temporaryPassword }, isReset: false, loginSent: true });
        setCopied(false);
      } else {
        setToast(`${s.fullName} now has access. They sign in with the password they chose when signing up.`);
      }
      await load();
    } catch (e) {
      setAccessError(e instanceof Error ? e.message : 'Could not give access.');
    } finally {
      setBusyId(null);
    }
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
        selectable.forEach((s) => next.delete(s.id));
        return next;
      }
      return new Set([...prev, ...selectable.map((s) => s.id)]);
    });
  }

  async function moveSelected() {
    if (selected.size === 0 || !moveTo) return;
    setMoving(true);
    setError(null);
    try {
      const target = moveTo === NO_BATCH ? null : moveTo;
      const mode = target === null ? 'replace' : moveMode;
      const res = await studentsApi.move([...selected], target, mode);
      const n = `${res.moved} student${res.moved === 1 ? '' : 's'}`;
      setToast(
        target === null ? `${n} taken out of all their batches.`
          : mode === 'add' ? `${n} added to ${res.batchName}. They keep their other batches.`
            : mode === 'remove' ? `${n} removed from ${res.batchName}.`
              : `${n} moved to ${res.batchName} (their only batch now). Their batch courses are open now.`,
      );
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
      batchIds: batchIdsOf(s),
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
        batchIds: form.batchIds,
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
        <StatCard icon="Users" label="Students" value={current.length} tone="blue" hint={`${tabCounts.active} active`} />
        <StatCard icon="Send" label="Paid · login not sent" value={tabCounts.new} tone="green" hint={tabCounts.new > 0 ? 'Send their login' : 'Nobody waiting'} />
        <StatCard icon="Phone" label="Payment pending" value={tabCounts.payment} tone="orange" hint={tabCounts.payment > 0 ? 'Call them' : 'Nobody waiting'} />
        <StatCard icon="Key" label="Temporary password" value={tempPassword} tone="purple" hint="Not changed yet" />
      </div>

      <section className="card">
        <div className="card-head st-tabs">
          <div className="chips" role="tablist" aria-label="Student stage">
            {TABS.map((t) => (
              <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={`chip ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
                {t.label}
                <span className="count">{tabCounts[t.id]}</span>
              </button>
            ))}
          </div>
          {TABS.find((t) => t.id === tab)?.hint && <p className="muted small st-tab-hint">{TABS.find((t) => t.id === tab)!.hint}</p>}
        </div>
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
            <select className="select input-sm" value={moveMode} onChange={(e) => setMoveMode(e.target.value as typeof moveMode)} aria-label="What to do" disabled={moveTo === NO_BATCH}>
              <option value="add">Add to batch (keep other batches)</option>
              <option value="replace">Move to batch (only this batch)</option>
              <option value="remove">Remove from batch</option>
            </select>
            <select className="select input-sm" value={moveTo} onChange={(e) => setMoveTo(e.target.value)} aria-label="Batch">
              <option value="">Choose batch…</option>
              {batches.map((b) => <option key={b.id} value={b.id}>{b.name}{batchTiming(b) ? ` · ${batchTiming(b)}` : ''}</option>)}
              <option value={NO_BATCH}>— Take out of all batches —</option>
            </select>
            <button type="button" className="btn btn-primary btn-sm" disabled={!moveTo || moving} onClick={() => void moveSelected()}>
              {moving ? 'Saving…' : moveTo === NO_BATCH ? 'Take out' : moveMode === 'add' ? 'Add' : moveMode === 'remove' ? 'Remove' : 'Move'}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelected(new Set())}>Cancel</button>
          </div>
        )}

        {visible.length === 0 ? (
          <EmptyState
            icon="Users"
            title={current.length === 0 ? 'No students yet' : tab === 'new' && !filtersOn ? 'Nobody waiting for a login' : tab === 'payment' && !filtersOn ? 'No pending payments' : 'No students match these filters'}
            text={current.length === 0
              ? (canManage ? 'Students appear here when they sign up, or use “Add student”.' : 'When an Admin places students in your batch, they appear here.')
              : tab === 'new' && !filtersOn ? 'When an enquiry is marked Paid in Admissions & Leads, the student appears here.'
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
                      <input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} disabled={selectable.length === 0} aria-label="Select all shown students" />
                    </th>
                  )}
                  <th>Student</th>
                  <th>Batch</th>
                  <th>Courses</th>
                  <th>Joined</th>
                  <th>Status</th>
                  {(canManage || canSendLogin) && <th className="actions">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {visible.map((s) => {
                  const st = statusOf(s);
                  const stage = stageOf(s);
                  const busy = busyId === s.id;
                  // Waiting for payment / login: only "Mark paid" or "Send login" may give a batch.
                  const locked = stage === 'new' || stage === 'payment';
                  const lockedWhy = stage === 'new' ? 'Send the login first' : 'Mark as paid first';
                  return (
                    <tr key={s.id} className={selected.has(s.id) ? 'is-selected' : ''}>
                      {canManage && (
                        <td className="st-check">
                          <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} disabled={locked} title={locked ? lockedWhy : undefined} aria-label={`Select ${s.fullName}`} />
                        </td>
                      )}
                      <td data-label="Student">
                        <Person name={s.fullName || s.email} sub={s.email} />
                        {s.phoneNumber && <span className="st-phone"><Icon.Phone size={12} /> {s.phoneNumber}</span>}
                      </td>
                      <td data-label="Batch">
                        {batchIdsOf(s).length > 0 ? (
                          <span className="st-batches">
                            {batchIdsOf(s).map((id) => {
                              const b = s.batches?.find((x) => x.id === id) ?? batches.find((x) => x.id === id);
                              return (
                                <button key={id} type="button" className="link-btn" onClick={() => setBatchFilter(id)} title={batchTiming(b) ? `Class time ${batchTiming(b)}` : undefined}>
                                  <span className="badge badge-blue">{b?.name ?? batchName(id) ?? 'Batch'}</span>
                                </button>
                              );
                            })}
                          </span>
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
                          {stage === 'new' ? (
                            <span className="badge badge-dot badge-green" title="Paid enquiry. No login sent yet.">Paid · login not sent</span>
                          ) : stage === 'payment' ? (
                            <span className="badge badge-dot badge-orange" title="Signed up but not in a batch, so no lessons open">Payment pending</span>
                          ) : (
                            <span className={`badge badge-dot badge-${st.tone}`}>{st.label}</span>
                          )}
                          {s.mustChangePassword && !s.awaitingLogin && <span className="badge badge-purple st-temp" title="Still using the temporary password from the email"><Icon.Key size={12} /> Temp password</span>}
                        </span>
                      </td>
                      {!canManage && canSendLogin && (
                        <td className="actions">
                          {stage === 'new' && (
                            <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => openAccess(s)}>
                              <Icon.Send size={15} /> Send login
                            </button>
                          )}
                        </td>
                      )}
                      {canManage && (
                        <td className="actions">
                          <div className="row-end">
                            {stage === 'new' && (
                              <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => openAccess(s)} title={s.addedByStaff ? 'Choose a batch and email the one-time password' : 'Choose a batch to open their lessons'}>
                                <Icon.Send size={15} /> {s.addedByStaff ? 'Send login' : 'Give access'}
                              </button>
                            )}
                            {stage === 'payment' && (
                              <>
                                {s.phoneNumber && (
                                  <a className="icon-btn sm" href={`https://wa.me/${digits(s.phoneNumber)}`} target="_blank" rel="noreferrer" title="WhatsApp" aria-label={`WhatsApp ${s.fullName}`}>
                                    <Icon.WhatsApp size={15} />
                                  </a>
                                )}
                                <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => openAccess(s)} title="Payment received: choose a batch to open their lessons">
                                  <Icon.CheckCircle size={15} /> Mark paid
                                </button>
                              </>
                            )}
                            <button type="button" className="icon-btn sm" disabled={busy || locked} onClick={() => openEdit(s)} title={locked ? lockedWhy : "Edit / change batch"} aria-label={`Edit ${s.fullName}`}>
                              <Icon.Edit size={15} />
                            </button>
                            <button type="button" className="icon-btn sm" disabled={busy || locked} onClick={() => setConfirmReset(s)} title={locked ? lockedWhy : "Email a new temporary password"} aria-label={`Reset password for ${s.fullName}`}>
                              <Icon.Key size={15} />
                            </button>
                            <button type="button" className={`icon-btn sm ${st.label === 'Suspended' ? '' : 'danger'}`} disabled={busy || locked} onClick={() => void toggleStatus(s)} title={locked ? lockedWhy : st.label === 'Suspended' ? 'Activate' : 'Suspend (cannot sign in)'} aria-label={`${st.label === 'Suspended' ? 'Activate' : 'Suspend'} ${s.fullName}`}>
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
        subtitle={editing ? 'Changing batches opens the courses of the chosen batches and closes the others. Progress is kept.' : 'We email the student their login details with a temporary password. They choose their own password at first sign-in.'}
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
            <span className="label" id="s-batches-label">Batches <span className="muted">(choose one or more — e.g. a morning and an evening batch)</span></span>
            {batches.length === 0 ? (
              <span className="hint">No batches yet. <Link to="/app/batches">Create a batch</Link> first.</span>
            ) : (
              <div className="st-batch-pick" role="group" aria-labelledby="s-batches-label">
                {batches.map((b) => {
                  const on = form.batchIds.includes(b.id);
                  return (
                    <label key={b.id} className={`st-batch-option ${on ? 'active' : ''}`}>
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => setForm({ ...form, batchIds: on ? form.batchIds.filter((x) => x !== b.id) : [...form.batchIds, b.id] })}
                      />
                      <span>
                        <strong>{b.name}</strong>
                        <small>
                          {[batchTiming(b), `${b.courses.length} course${b.courses.length === 1 ? '' : 's'}`, b.mentorName].filter(Boolean).join(' · ')}
                        </small>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
            <span className="hint">
              {form.batchIds.length > 0
                ? <>Opens: {[...new Set(batches.filter((b) => form.batchIds.includes(b.id)).flatMap((b) => b.courses.map((c) => c.title)))].join(', ') || 'no courses assigned to these batches yet'}. They see the live classes of every chosen batch.</>
                : 'Without a batch the student only sees courses marked “open to every student” and no live classes.'}
            </span>
          </div>
        </form>
      </Modal>

      {/* ── Give access to a paid student ── */}
      <Modal
        open={!!access}
        onClose={() => setAccess(null)}
        title={access?.addedByStaff ? `Send login to ${access.fullName}` : `Give access to ${access?.fullName ?? ''}`}
        subtitle={access?.addedByStaff
          ? 'Choose their batch. We email a one-time password; they choose their own password at first sign-in.'
          : 'Choose their batch. Its lessons open straight away. They keep the password they chose when signing up.'}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setAccess(null)} disabled={busyId === access?.id}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={() => void giveAccess()} disabled={busyId === access?.id || accessBatches.length === 0}>
              {busyId === access?.id ? 'Saving…' : access?.addedByStaff ? <><Icon.Send size={16} /> Save & email login</> : <><Icon.CheckCircle size={16} /> Give access</>}
            </button>
          </>
        }
      >
        {access && (
          <div className="field" style={{ marginBottom: 0 }}>
            {accessError && <div style={{ marginBottom: 14 }}><Alert tone="error">{accessError}</Alert></div>}
            <Person name={access.fullName} sub={[access.email, access.phoneNumber].filter(Boolean).join(' · ')} />
            <span className="label" id="access-batches-label" style={{ marginTop: 16 }}>Batch</span>
            {batches.length === 0 ? (
              <span className="hint">{canManage ? <>No batches yet. <Link to="/app/batches">Create a batch</Link> first.</> : 'You don’t lead any batch yet. Ask an Admin to make you the teacher of a batch.'}</span>
            ) : (
              <div className="st-batch-pick" role="group" aria-labelledby="access-batches-label">
                {batches.map((b) => {
                  const on = accessBatches.includes(b.id);
                  return (
                    <label key={b.id} className={`st-batch-option ${on ? 'active' : ''}`}>
                      <input type="checkbox" checked={on} onChange={() => setAccessBatches(on ? accessBatches.filter((x) => x !== b.id) : [...accessBatches, b.id])} />
                      <span>
                        <strong>{b.name}</strong>
                        <small>{[batchTiming(b), `${b.courses.length} course${b.courses.length === 1 ? '' : 's'}`, b.mentorName].filter(Boolean).join(' · ')}</small>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}
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
        title={passwordResult?.isReset ? 'New password sent' : passwordResult?.loginSent ? 'Login sent' : 'Student added'}
        subtitle={passwordResult ? `We emailed the login details to ${passwordResult.result.student.email}.` : undefined}
        footer={<button type="button" className="btn btn-primary" onClick={() => setPasswordResult(null)}>Done</button>}
      >
        {passwordResult && (
          <div className="st-login">
            <Person name={passwordResult.result.student.fullName} sub={passwordResult.result.student.batches?.length ? `Batch: ${passwordResult.result.student.batches.map((b) => b.name).join(', ')}` : passwordResult.result.student.batchName ? `Batch: ${passwordResult.result.student.batchName}` : 'Not in a batch yet'} size="lg" />
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
