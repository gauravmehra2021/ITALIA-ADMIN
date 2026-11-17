import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Icon } from '../components/Icons';
import { Alert, EmptyState, Modal, PageHeader, Spinner, StatCard, timeAgo } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { CLASS_META, classStatus, isUpcoming } from '../lib/status';
import { classesApi, coursesApi } from '../services/platformApi';
import type { ClassSession, Course } from '../types';
import './pages.css';

type View = 'upcoming' | 'past' | 'all';

const DURATIONS = [30, 45, 60, 90, 120];

/** Value for <input type="datetime-local">: next full hour, local time. */
function nextHourLocal() {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;
}

export function ClassesPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<ClassSession[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [view, setView] = useState<View>('upcoming');
  const [busyId, setBusyId] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
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
      const [classList, courseList] = await Promise.all([classesApi.list(), coursesApi.list({ pageSize: 100 })]);
      setItems(classList);
      setCourses(courseList.items);
      setCourseId((id) => id || courseList.items[0]?.id || '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load classes.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

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
      setToast(`Reminder sent to ${res.sentCount} student${res.sentCount === 1 ? '' : 's'} for “${c.title}”.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the reminder.');
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
    setCreating(true);
    setFormError(null);
    try {
      await classesApi.create({
        courseId,
        mentorId: user?.id,
        title: title.trim(),
        scheduledAtUtc: new Date(when).toISOString(),
        durationMinutes: duration,
        meetingUrl: meetUrl.trim() || undefined,
      });
      setToast(`“${title.trim()}” scheduled.`);
      setFormOpen(false);
      setTitle('');
      setMeetUrl('');
      setWhen(nextHourLocal());
      setView('upcoming');
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not schedule the class.');
    } finally {
      setCreating(false);
    }
  }

  const stats = useMemo(() => {
    const now = Date.now();
    const week = now + 7 * 86400000;
    return {
      upcoming: items.filter(isUpcoming).length,
      live: items.filter((c) => classStatus(c) === 'Live').length,
      week: items.filter((c) => isUpcoming(c) && new Date(c.scheduledAtUtc).getTime() < week).length,
      done: items.filter((c) => !isUpcoming(c) && classStatus(c) !== 'Cancelled').length,
    };
  }, [items]);

  const visible = useMemo(() => {
    const list = items.filter((c) => (view === 'all' ? true : view === 'upcoming' ? isUpcoming(c) : !isUpcoming(c)));
    return list.sort((a, b) => {
      const d = +new Date(a.scheduledAtUtc) - +new Date(b.scheduledAtUtc);
      return view === 'upcoming' ? d : -d;
    });
  }, [items, view]);

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

  return (
    <div className="page">
      <PageHeader
        title="Live Classes"
        subtitle="Weekly speaking classes on Google Meet. Schedule them, remind students when they start, and join with one click."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => { setFormError(null); setFormOpen(true); }} disabled={courses.length === 0}>
            <Icon.Plus size={18} /> Schedule class
          </button>
        }
      />

      {toast && <Alert tone="success" onClose={() => setToast(null)}>{toast}</Alert>}
      {error && <Alert tone="error" onClose={() => setError(null)}>{error}</Alert>}

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
          <span className="muted small">Times shown in your time zone</span>
        </div>

        {visible.length === 0 ? (
          <EmptyState
            icon="Calendar"
            title={view === 'past' ? 'No past classes' : 'No classes scheduled'}
            text={view === 'past' ? 'Finished classes will be listed here.' : 'Each unit has a weekly live speaking class. Schedule the next one so students can practise with a teacher.'}
            action={view !== 'past' && courses.length > 0 ? (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setFormOpen(true)}><Icon.Plus size={16} /> Schedule class</button>
            ) : undefined}
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
                  const t = (x: Date) => x.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                  return (
                    <article key={c.id} className={`class-row ${s === 'Live' ? 'is-live' : ''}`}>
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
                          <span><Icon.Book size={14} /> {c.courseTitle}</span>
                          <span><Icon.Cap size={14} /> {c.mentorName}</span>
                          <span><Icon.Clock size={14} /> {c.durationMinutes} min{upcoming && s !== 'Live' ? ` · starts ${timeAgo(c.scheduledAtUtc)}` : ''}</span>
                        </div>
                      </div>
                      <div className="class-actions">
                        {upcoming && (
                          <button type="button" className="btn btn-secondary btn-sm" disabled={busyId === c.id} onClick={() => void notify(c)} title="Send a 'class is starting' notification to enrolled students">
                            <Icon.Bell size={15} /> {busyId === c.id ? 'Sending…' : 'Remind students'}
                          </button>
                        )}
                        <button type="button" className="icon-btn sm" onClick={() => void copyLink(c)} title="Copy meeting link" aria-label="Copy meeting link">
                          <Icon.Copy size={15} />
                        </button>
                        <button type="button" className={`btn btn-sm ${s === 'Live' ? 'btn-danger' : 'btn-primary'}`} onClick={() => void join(c)}>
                          <Icon.Video size={15} /> Join
                        </button>
                      </div>
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
        subtitle={`You (${user?.fullName}) will be the teacher. Students enrolled in the course see it in their app.`}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setFormOpen(false)} disabled={creating}>Cancel</button>
            <button type="submit" form="class-form" className="btn btn-primary" disabled={creating}>{creating ? 'Scheduling…' : 'Schedule class'}</button>
          </>
        }
      >
        <form id="class-form" onSubmit={schedule}>
          {formError && <div style={{ marginBottom: 14 }}><Alert tone="error">{formError}</Alert></div>}
          <div className="field">
            <label htmlFor="cls-course">Course</label>
            <select id="cls-course" value={courseId} onChange={(e) => setCourseId(e.target.value)} required>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="cls-title">Class title</label>
            <input id="cls-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Unit 2 speaking class — numbers & the alphabet" required />
          </div>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="cls-when">Date & time</label>
              <input id="cls-when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="cls-dur">Length</label>
              <select id="cls-dur" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                {DURATIONS.map((m) => (
                  <option key={m} value={m}>{m} minutes</option>
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
    </div>
  );
}
