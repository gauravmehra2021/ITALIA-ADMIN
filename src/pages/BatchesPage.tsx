import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { Alert, EmptyState, Modal, PageHeader, Spinner, StatCard, formatDate } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { batchTiming } from '../lib/status';
import { batchesApi, coursesApi, studentsApi } from '../services/platformApi';
import { roleLabel, type Batch, type Course, type TeacherOption } from '../types';
import './pages.css';
import './students.css';

/**
 * Batches — groups of students who learn together (e.g. "A0 Morning", "A1 Advance").
 * The courses assigned to a batch are the only courses its students can open.
 * Admins create and change batches; Staff and Teachers can look.
 */

interface FormState {
  name: string;
  description: string;
  mentorId: string;
  startDate: string;
  startTime: string;
  endTime: string;
  courseIds: string[];
}

const emptyForm = (): FormState => ({ name: '', description: '', mentorId: '', startDate: '', startTime: '', endTime: '', courseIds: [] });

const isPublished = (status: unknown) => status === 'Published' || status === 1;

export function BatchesPage() {
  const { can } = useAuth();
  const isAdmin = can('batches', 'Full');

  const [batches, setBatches] = useState<Batch[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [withoutBatch, setWithoutBatch] = useState(0);
  // Unique students in at least one batch (a student in two batches counts once).
  const [totalInBatches, setTotalInBatches] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Batch | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Batch | null>(null);

  async function load() {
    try {
      const [b, t, s] = await Promise.all([batchesApi.list(), batchesApi.teachers(), studentsApi.list()]);
      setBatches(b);
      setTeachers(t);
      setWithoutBatch(s.filter((x) => !x.isDeleted && !x.batchId && !(x.batches?.length)).length);
      setTotalInBatches(s.filter((x) => !x.isDeleted && (!!x.batchId || !!x.batches?.length)).length);
      if (isAdmin) {
        const page = await coursesApi.list({ pageSize: 200, sortBy: 'order' });
        setCourses(page.items);
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load batches.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const openToAll = courses.filter((c) => c.openToAll && isPublished(c.status));

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(b: Batch) {
    setEditing(b);
    setForm({
      name: b.name,
      description: b.description,
      mentorId: b.mentorId ?? '',
      startDate: b.startDateUtc ? b.startDateUtc.slice(0, 10) : '',
      startTime: b.startTime ?? '',
      endTime: b.endTime ?? '',
      courseIds: b.courses.map((c) => c.id),
    });
    setFormError(null);
    setFormOpen(true);
  }

  function toggleCourse(id: string) {
    setForm((f) => ({ ...f, courseIds: f.courseIds.includes(id) ? f.courseIds.filter((x) => x !== id) : [...f.courseIds, id] }));
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    const body = {
      name: form.name.trim(),
      description: form.description.trim(),
      mentorId: form.mentorId || null,
      courseIds: form.courseIds,
      startDateUtc: form.startDate ? new Date(`${form.startDate}T00:00:00Z`).toISOString() : null,
      startTime: form.startTime || null,
      endTime: form.endTime || null,
    };
    try {
      if (editing) {
        await batchesApi.update(editing.id, body);
        setToast(`“${body.name}” saved. Its ${editing.studentCount} student${editing.studentCount === 1 ? '' : 's'} now see exactly these courses.`);
      } else {
        await batchesApi.create(body);
        setToast(`Batch “${body.name}” created. Now add students to it from the Students page.`);
      }
      setFormOpen(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save the batch.');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirmDelete) return;
    const b = confirmDelete;
    setConfirmDelete(null);
    try {
      await batchesApi.delete(b.id);
      setToast(`Batch “${b.name}” deleted.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete the batch.');
    }
  }

  if (loading) return <Spinner label="Loading batches…" />;

  return (
    <div className="page">
      <PageHeader
        title="Batches"
        subtitle="Group students who learn together and choose which courses they can open. Put students who already speak some Italian in a more advanced batch."
        actions={isAdmin && <button type="button" className="btn btn-primary" onClick={openCreate}><Icon.Plus size={18} /> New batch</button>}
      />

      {toast && <Alert tone="success" onClose={() => setToast(null)}>{toast}</Alert>}
      {error && <Alert tone="error" onClose={() => setError(null)}>{error}</Alert>}

      <div className="stats">
        <StatCard icon="Layers" label="Batches" value={batches.length} tone="blue" />
        <StatCard icon="Users" label="Students in batches" value={totalInBatches} tone="green" />
        <StatCard icon="Alert" label="Students without a batch" value={withoutBatch} tone={withoutBatch > 0 ? 'orange' : 'green'} to={withoutBatch > 0 ? '/app/students?batch=none' : undefined} hint={withoutBatch > 0 ? 'Click to place them' : undefined} />
        {isAdmin && <StatCard icon="Globe" label="Courses open to everyone" value={openToAll.length} tone="teal" hint={openToAll.length ? openToAll.map((c) => c.title).join(', ') : 'None — set in the course details'} />}
      </div>

      {batches.length === 0 ? (
        <section className="card">
          <EmptyState
            icon="Layers"
            title="No batches yet"
            text={isAdmin ? 'Create a batch such as “A0 Morning – Jan 2027”, choose its courses, then place students in it.' : 'When an Admin creates batches they appear here.'}
            action={isAdmin ? <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}><Icon.Plus size={16} /> New batch</button> : undefined}
          />
        </section>
      ) : (
        <div className="batch-grid">
          {batches.map((b) => (
            <article key={b.id} className="card batch-card">
              <div className="batch-top">
                <span className="batch-level" aria-hidden><Icon.Layers size={20} /></span>
                <div className="batch-title">
                  <h3>{b.name}</h3>
                  <span className="muted small">
                    {b.mentorName ? <><Icon.Cap size={13} /> {b.mentorName}</> : 'No teacher yet'}
                    {b.startDateUtc && <> · Starts {formatDate(b.startDateUtc)}</>}
                  </span>
                  {batchTiming(b) && (
                    <span className="batch-time"><Icon.Clock size={13} /> Classes {batchTiming(b)}</span>
                  )}
                </div>
              </div>
              {b.description && <p className="batch-desc">{b.description}</p>}
              <div className="batch-courses">
                <span className="label xs">Courses this batch can open</span>
                {b.courses.length === 0 ? (
                  <span className="badge badge-orange">No courses assigned</span>
                ) : (
                  <div className="batch-chips">
                    {b.courses.map((c) => (
                      <span key={c.id} className="badge badge-blue" title={isPublished(c.status) ? undefined : 'Not published yet: students won’t see it until it is'}>
                        {c.title}{!isPublished(c.status) && ' (draft)'}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="batch-foot">
                <Link to={`/app/students?batch=${b.id}`} className="btn btn-secondary btn-sm">
                  <Icon.Users size={15} /> {b.studentCount} student{b.studentCount === 1 ? '' : 's'}
                </Link>
                {isAdmin && (
                  <div className="row-end">
                    <button type="button" className="icon-btn sm" onClick={() => openEdit(b)} title="Edit batch" aria-label={`Edit ${b.name}`}><Icon.Edit size={15} /></button>
                    <button type="button" className="icon-btn sm danger" onClick={() => setConfirmDelete(b)} title="Delete batch" aria-label={`Delete ${b.name}`}><Icon.Trash size={15} /></button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* ── Create / edit batch ── */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        wide
        title={editing ? `Edit “${editing.name}”` : 'New batch'}
        subtitle="Students in this batch can open only the courses you tick here (plus courses open to every student)."
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</button>
            <button type="submit" form="batch-form" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save batch' : 'Create batch'}</button>
          </>
        }
      >
        <form id="batch-form" onSubmit={save}>
          {formError && <div style={{ marginBottom: 14 }}><Alert tone="error">{formError}</Alert></div>}
          <div className="field">
            <label htmlFor="b-name">Batch name</label>
            <input id="b-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Morning 11–12" maxLength={80} required />
          </div>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="b-teacher">Teacher</label>
              <select id="b-teacher" className="select" value={form.mentorId} onChange={(e) => setForm({ ...form, mentorId: e.target.value })}>
                <option value="">No teacher yet</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.fullName} ({roleLabel(t.role)})</option>)}
              </select>
              <span className="hint">The teacher sees this batch and its students.</span>
            </div>
            <div className="field">
              <label htmlFor="b-start">Start date <span className="muted">(optional)</span></label>
              <input id="b-start" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
          </div>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="b-time-start">Class starts <span className="muted">(optional)</span></label>
              <input id="b-time-start" type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="b-time-end">Class ends</label>
              <input id="b-time-end" type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
            </div>
          </div>
          <span className="hint" style={{ display: 'block', marginTop: -8, marginBottom: 14 }}>
            The batch’s usual live-class time, e.g. 11:00–12:00 for a morning batch or 17:00–18:00 for an evening batch. Scheduling a class for this batch fills it in. Students can be in more than one batch.
          </span>
          <div className="field">
            <label htmlFor="b-desc">Notes <span className="muted">(optional)</span></label>
            <input id="b-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Mon–Fri 9:00, students going to Italy for work" maxLength={200} />
          </div>

          <div className="label" style={{ marginBottom: 8 }}>Courses this batch can open <span className="muted">({form.courseIds.length} chosen)</span></div>
          {courses.length === 0 ? (
            <Alert tone="info">No courses yet. Create one under Courses & Content first.</Alert>
          ) : (
            <div className="course-pick">
              {courses.map((c) => {
                const on = form.courseIds.includes(c.id);
                return (
                  <label key={c.id} className={`course-pick-item ${on ? 'active' : ''}`}>
                    <input type="checkbox" checked={on} onChange={() => toggleCourse(c.id)} />
                    <span>
                      <strong>{c.title}</strong>
                      <small>
                        {c.cefrLevel} · {c.lessonsCount ?? 0} lessons
                        {!isPublished(c.status) && <span className="badge badge-gray">Draft</span>}
                        {c.openToAll && <span className="badge badge-teal">Open to all</span>}
                      </small>
                    </span>
                  </label>
                );
              })}
            </div>
          )}
          {editing && editing.studentCount > 0 && (
            <p className="hint" style={{ marginTop: 10 }}>
              Saving updates all {editing.studentCount} student{editing.studentCount === 1 ? '' : 's'} at once: ticked courses open for them, unticked ones close. Their progress is never deleted.
            </p>
          )}
        </form>
      </Modal>

      {/* ── Delete ── */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title={`Delete “${confirmDelete?.name ?? ''}”?`}
        subtitle={confirmDelete && confirmDelete.studentCount > 0
          ? `It still has ${confirmDelete.studentCount} student${confirmDelete.studentCount === 1 ? '' : 's'}. Move them to another batch first.`
          : 'The batch is empty, so no student loses access.'}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
            {confirmDelete && confirmDelete.studentCount > 0 ? (
              <Link to={`/app/students?batch=${confirmDelete.id}`} className="btn btn-primary"><Icon.Users size={16} /> See its students</Link>
            ) : (
              <button type="button" className="btn btn-danger" onClick={() => void remove()}><Icon.Trash size={16} /> Delete batch</button>
            )}
          </>
        }
      >
        <p className="muted" style={{ margin: 0 }}>Courses and student progress are not affected.</p>
      </Modal>
    </div>
  );
}
