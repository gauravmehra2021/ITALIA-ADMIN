import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { Alert, EmptyState, Modal, PageHeader, Spinner, StatCard, timeAgo } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { batchTiming, CLASS_META, classStatus, isUpcoming } from '../lib/status';
import { batchesApi, classesApi, coursesApi } from '../services/platformApi';
import type { Batch, ClassSession, Course, TeacherOption } from '../types';
import './pages.css';

type View = 'upcoming' | 'past' | 'all';

const DURATIONS = [30, 45, 60, 90, 120, 150, 180];
const pad = (n: number) => String(n).padStart(2, '0');

/** Value for <input type="datetime-local">: next full hour, local time. */
function nextHourLocal() {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;
}

/** Keeps the chosen day but moves the time to the batch's usual start ("11:00"). Tomorrow if that time already passed today. */
function atBatchTime(current: string, hhmm: string) {
  const day = new Date(current || Date.now());
  const [h, m] = hhmm.split(':').map(Number);
  day.setHours(h, m, 0, 0);
  if (day.getTime() < Date.now()) day.setDate(day.getDate() + 1);
  return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}T${pad(h)}:${pad(m)}`;
}

function minutesBetween(start: string, end: string) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}


export function ClassesPage() {
  const { user, can } = useAuth();
  const canSchedule = can('classes', 'Full');
  const [items, setItems] = useState<ClassSession[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [view, setView] = useState<View>('upcoming');
  const [batchFilter, setBatchFilter] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<ClassSession | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [batchId, setBatchId] = useState('');
  const [mentorId, setMentorId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [title, setTitle] = useState('');
  const [when, setWhen] = useState(nextHourLocal);
  const [duration, setDuration] = useState(60);
  const [meetUrl, setMeetUrl] = useState('');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [classList, batchList] = await Promise.all([classesApi.list(), batchesApi.list().catch(() => [] as Batch[])]);
      setItems(classList);
      setBatches(batchList.sort((a, b) => (a.startTime ?? '99').localeCompare(b.startTime ?? '99') || a.name.localeCompare(b.name)));
      if (canSchedule) {
        coursesApi.list({ pageSize: 100 }).then((r) => setCourses(r.items)).catch(() => setCourses([]));
        batchesApi.teachers().then(setTeachers).catch(() => setTeachers([]));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load classes.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedBatch = batches.find((b) => b.id === batchId) ?? null;

  /** Choosing a batch fills in its usual time, length and teacher. */
  function pickBatch(id: string) {
    setBatchId(id);
    const b = batches.find((x) => x.id === id);
    if (!b) return;
    if (b.startTime) setWhen((w) => atBatchTime(w, b.startTime!));
    if (b.startTime && b.endTime) {
      const mins = minutesBetween(b.startTime, b.endTime);
      if (mins >= 15 && mins <= 240) setDuration(mins);
    }
    setMentorId(b.mentorId ?? user?.id ?? '');
  }

  function openForm(prefillBatch?: string) {
    setFormError(null);
    setTitle('');
    setMeetUrl('');
    setCourseId('');
    setWhen(nextHourLocal());
    setDuration(60);
    setBatchId('');
    setMentorId(user?.id ?? '');
    setFormOpen(true);
    const first = prefillBatch || (batchFilter || '');
    if (first) pickBatch(first);
  }

  async function join(c: ClassSession) {
    setError(null);
    try {
      const session = await classesApi.meeting(c.id);
      if (session.meetingUrl) window.open(session.meetingUrl, '_blank', 'noopener,noreferrer');
      else setError('This class has no meeting link yet.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open the meeting.');
    }
  }

  async function notify(c: ClassSession) {
    setBusyId(c.id);
    setError(null);
    try {
      const res = await classesApi.notifyStart(c.id);
      setToast(`Reminder sent to ${res.sentCount} student${res.sentCount === 1 ? '' : 's'}${c.batchName ? ` of ${c.batchName}` : ''} for “${c.title}”.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the reminder.');
    } finally {
      setBusyId(null);
    }
  }

  async function cancelClass() {
    if (!confirmCancel) return;
    const c = confirmCancel;
    setConfirmCancel(null);
    setBusyId(c.id);
    setError(null);
    try {
      await classesApi.cancel(c.id);
      setToast(`“${c.title}” was cancelled. Students no longer see it.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not cancel the class.');
    } finally {
      setBusyId(null);
    }
  }

  async function copyLink(c: ClassSession) {
    try {
      const session = c.meetingUrl ? c : await classesApi.meeting(c.id);
      if (!session.meetingUrl) return;
      await navigator.clipboard.writeText(session.meetingUrl);
      setToast('Meeting link copied.');
    } catch {
      setError('Could not copy the link.');
    }
  }

  async function schedule(e: FormEvent) {
    e.preventDefault();
    if (!batchId) {
      setFormError('Choose the batch this class is for.');
      return;
    }
    setCreating(true);
    setFormError(null);
    try {
      const created = await classesApi.create({
        batchId,
        mentorId: mentorId || null,
        courseId: courseId || null,
        title: title.trim(),
        scheduledAtUtc: new Date(when).toISOString(),
        durationMinutes: duration,
        meetingUrl: meetUrl.trim() || undefined,
      });
      setToast(`“${created.title}” scheduled for ${created.batchName} (${created.batchStudentCount ?? 0} student${created.batchStudentCount === 1 ? '' : 's'}).`);
      setFormOpen(false);
      setView('upcoming');
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not schedule the class.');
    } finally {
      setCreating(false);
    }
  }

  const inFilter = useMemo(() => items.filter((c) => !batchFilter || c.batchId === batchFilter), [items, batchFilter]);

  const stats = useMemo(() => {
    const now = Date.now();
    const week = now + 7 * 86400000;
    return {
      upcoming: inFilter.filter(isUpcoming).length,
      live: inFilter.filter((c) => classStatus(c) === 'Live').length,
      week: inFilter.filter((c) => isUpcoming(c) && new Date(c.scheduledAtUtc).getTime() < week).length,
      done: inFilter.filter((c) => !isUpcoming(c) && classStatus(c) !== 'Cancelled').length,
    };
  }, [inFilter]);

  const visible = useMemo(() => {
    const list = inFilter.filter((c) => (view === 'all' ? true : view === 'upcoming' ? isUpcoming(c) : !isUpcoming(c)));
    return list.sort((a, b) => {
      const d = +new Date(a.scheduledAtUtc) - +new Date(b.scheduledAtUtc);
      return view === 'upcoming' ? d : -d;
    });
  }, [inFilter, view]);

  // Group by day for an agenda-style list.
  const groups = useMemo(() => {
    const map = new Map<string, ClassSession[]>();
    visible.forEach((c) => {
      const key = new Date(c.scheduledAtUtc).toDateString();
      map.set(key, [...(map.get(key) ?? []), c]);
    });
    return [...map.entries()];
  }, [visible]);

  const dayLabel = (key: string) => {
    const d = new Date(key);
    const today = new Date().toDateString();
    const tomorrow = new Date(Date.now() + 86400000).toDateString();
    if (key === today) return 'Today';
    if (key === tomorrow) return 'Tomorrow';
    return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  };

  if (loading) return <Spinner label="Loading classes…" />;

  const noBatches = batches.length === 0;
  const scheduleButton = (small = false) => (
    <button type="button" className={`btn btn-primary ${small ? 'btn-sm' : ''}`} onClick={() => openForm()} disabled={noBatches} title={noBatches ? 'Create a batch first' : undefined}>
      <Icon.Plus size={small ? 16 : 18} /> Schedule class
    </button>
  );

  return (
    <div className="page">
      <PageHeader
        title="Live Classes"
        subtitle="Schedule a Google Meet class for a batch. Only the students in that batch see it and get its reminders."
        actions={canSchedule && scheduleButton()}
      />

      {toast && <Alert tone="success" onClose={() => setToast(null)}>{toast}</Alert>}
      {error && <Alert tone="error" onClose={() => setError(null)}>{error}</Alert>}
      {canSchedule && noBatches && (
        <Alert tone="info">Classes are scheduled for a batch. <Link to="/app/batches">Create your first batch</Link> (for example “Morning 11–12”) to schedule a class.</Alert>
      )}

      <div className="stats">
        <StatCard icon="Calendar" tone="blue" label="Upcoming" value={stats.upcoming} />
        <StatCard icon="Video" tone="red" label="Live now" value={stats.live} />
        <StatCard icon="Clock" tone="purple" label="Next 7 days" value={stats.week} />
        <StatCard icon="CheckCircle" tone="green" label="Finished" value={stats.done} />
      </div>

      <section className="card">
        <div className="card-head toolbar">
          <div className="chips" role="tablist">
            {([
              ['upcoming', 'Upcoming'],
              ['past', 'Past'],
              ['all', 'All'],
            ] as [View, string][]).map(([v, label]) => (
              <button key={v} type="button" role="tab" aria-selected={view === v} className={`chip ${view === v ? 'active' : ''}`} onClick={() => setView(v)}>
                {label}
              </button>
            ))}
          </div>
          <div className="row-end" style={{ gap: 12 }}>
            {batches.length > 0 && (
              <select className="select input-sm" aria-label="Show classes of batch" value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)} style={{ maxWidth: 260 }}>
                <option value="">All batches</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}{batchTiming(b) ? ` · ${batchTiming(b)}` : ''}</option>
                ))}
              </select>
            )}
            <span className="muted small">Times shown in your time zone</span>
          </div>
        </div>

        {visible.length === 0 ? (
          <EmptyState
            icon="Calendar"
            title={view === 'past' ? 'No past classes' : 'No classes scheduled'}
            text={view === 'past' ? 'Finished classes will be listed here.' : 'Schedule the next speaking class for a batch so its students can practise with a teacher.'}
            action={canSchedule && view !== 'past' && !noBatches ? scheduleButton(true) : undefined}
          />
        ) : (
          <div className="agenda">
            {groups.map(([day, list]) => (
              <div key={day} className="agenda-day">
                <div className="agenda-date">{dayLabel(day)}</div>
                {list.map((c) => {
                  const d = new Date(c.scheduledAtUtc);
                  const end = new Date(d.getTime() + c.durationMinutes * 60000);
                  const s = classStatus(c);
                  const upcoming = isUpcoming(c);
                  const cancelled = s === 'Cancelled';
                  const t = (x: Date) => x.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                  return (
                    <article key={c.id} className={`class-row ${s === 'Live' ? 'is-live' : ''} ${cancelled ? 'is-dim' : ''}`}>
                      <div className="class-time">
                        <strong>{t(d)}</strong>
                        <span>{t(end)}</span>
                      </div>
                      <div className="class-main">
                        <div className="class-title">
                          <strong>{c.title}</strong>
                          <span className={`badge badge-dot badge-${CLASS_META[s].tone}`}>{s === 'Live' ? 'Live now' : s}</span>
                        </div>
                        <div className="class-meta">
                          {c.batchName ? (
                            <span className="class-batch"><Icon.Layers size={14} /> {c.batchName} · {c.batchStudentCount ?? 0} student{c.batchStudentCount === 1 ? '' : 's'}</span>
                          ) : (
                            c.courseTitle && <span><Icon.Book size={14} /> {c.courseTitle}</span>
                          )}
                          {c.batchName && c.courseTitle && <span><Icon.Book size={14} /> {c.courseTitle}</span>}
                          <span><Icon.Cap size={14} /> {c.mentorName}</span>
                          <span><Icon.Clock size={14} /> {c.durationMinutes} min{upcoming && s !== 'Live' ? ` · starts ${timeAgo(c.scheduledAtUtc)}` : ''}</span>
                        </div>
                      </div>
                      {!cancelled && (
                        <div className="class-actions">
                          {upcoming && canSchedule && (
                            <button type="button" className="btn btn-secondary btn-sm" disabled={busyId === c.id} onClick={() => void notify(c)} title={`Send a 'class is starting' notification to ${c.batchName ? `the students of ${c.batchName}` : 'the enrolled students'}`}>
                              <Icon.Bell size={15} /> {busyId === c.id ? 'Sending…' : 'Remind students'}
                            </button>
                          )}
                          <button type="button" className="icon-btn sm" onClick={() => void copyLink(c)} title="Copy meeting link" aria-label="Copy meeting link">
                            <Icon.Copy size={15} />
                          </button>
                          {upcoming && canSchedule && s !== 'Live' && (
                            <button type="button" className="icon-btn sm danger" disabled={busyId === c.id} onClick={() => setConfirmCancel(c)} title="Cancel class" aria-label={`Cancel ${c.title}`}>
                              <Icon.XCircle size={15} />
                            </button>
                          )}
                          <button type="button" className={`btn btn-sm ${s === 'Live' ? 'btn-danger' : 'btn-primary'}`} onClick={() => void join(c)}>
                            <Icon.Video size={15} /> Join
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </section>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Schedule a live class"
        subtitle="Choose a batch: only its students see the class in their portal and app, and only they get the reminder."
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setFormOpen(false)} disabled={creating}>Cancel</button>
            <button type="submit" form="class-form" className="btn btn-primary" disabled={creating || !batchId}>{creating ? 'Scheduling…' : 'Schedule class'}</button>
          </>
        }
      >
        <form id="class-form" onSubmit={schedule}>
          {formError && <div style={{ marginBottom: 14 }}><Alert tone="error">{formError}</Alert></div>}
          <div className="field">
            <label htmlFor="cls-batch">Batch</label>
            <select id="cls-batch" value={batchId} onChange={(e) => pickBatch(e.target.value)} required>
              <option value="" disabled>Choose a batch…</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}{batchTiming(b) ? ` · ${batchTiming(b)}` : ''} · {b.studentCount} student{b.studentCount === 1 ? '' : 's'}
                </option>
              ))}
            </select>
            {selectedBatch && (
              <span className="hint">
                {selectedBatch.studentCount === 0
                  ? 'This batch has no students yet — add students to it on the Students page.'
                  : `${selectedBatch.studentCount} student${selectedBatch.studentCount === 1 ? '' : 's'} will see this class${selectedBatch.mentorName ? ` · teacher ${selectedBatch.mentorName}` : ''}.`}
              </span>
            )}
          </div>
          <div className="field">
            <label htmlFor="cls-title">Class title <span className="muted">(optional)</span></label>
            <input id="cls-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder={selectedBatch ? `${selectedBatch.name} — live class` : 'e.g. Speaking practice — numbers & the alphabet'} />
          </div>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="cls-when">Date & time</label>
              <input id="cls-when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="cls-dur">Length</label>
              <select id="cls-dur" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                {[...new Set([...DURATIONS, duration])].sort((a, b) => a - b).map((m) => (
                  <option key={m} value={m}>{m} minutes</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="cls-teacher">Teacher</label>
              <select id="cls-teacher" value={mentorId} onChange={(e) => setMentorId(e.target.value)}>
                {user && !teachers.some((t) => t.id === user.id) && <option value={user.id}>{user.fullName} (you)</option>}
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>{t.fullName}{t.id === user?.id ? ' (you)' : ''}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="cls-course">Course <span className="muted">(optional)</span></label>
              <select id="cls-course" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                <option value="">— Not linked to a course —</option>
                {(selectedBatch?.courses.length ? selectedBatch.courses : courses).map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="cls-url">Google Meet link <span className="muted">(optional)</span></label>
            <input id="cls-url" type="url" value={meetUrl} onChange={(e) => setMeetUrl(e.target.value)} placeholder="https://meet.google.com/abc-defg-hij" />
            <span className="hint">Leave empty to use the academy’s usual meeting room.</span>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!confirmCancel}
        onClose={() => setConfirmCancel(null)}
        title={`Cancel “${confirmCancel?.title ?? ''}”?`}
        subtitle="Students of the batch will no longer see this class. This can't be undone — schedule a new class if needed."
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setConfirmCancel(null)}>Keep class</button>
            <button type="button" className="btn btn-danger" onClick={() => void cancelClass()}><Icon.XCircle size={16} /> Cancel class</button>
          </>
        }
      >
        {confirmCancel && (
          <p className="muted">
            {new Date(confirmCancel.scheduledAtUtc).toLocaleString(undefined, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
            {confirmCancel.batchName ? ` · ${confirmCancel.batchName}` : ''}
          </p>
        )}
      </Modal>
    </div>
  );
}
