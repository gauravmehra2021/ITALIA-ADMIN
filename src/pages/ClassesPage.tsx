import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { Empty, ErrorBox, Loading, SuccessBox } from '../components/StateBlock';
import { useAuth } from '../hooks/useAuth';
import { classesApi, coursesApi } from '../services/platformApi';
import { enumLabel, type ClassSession, type Course } from '../types';

const CLASS_STATUS = ['Scheduled', 'Live', 'Completed', 'Cancelled'];

export function ClassesPage() {
  const { hasRole, user } = useAuth();
  const [items, setItems] = useState<ClassSession[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [notifyingId, setNotifyingId] = useState<string | null>(null);
  const [showScheduleForm, setShowScheduleForm] = useState(false);

  // Form states
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [classTitle, setClassTitle] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [duration, setDuration] = useState(60);
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [classList, courseList] = await Promise.all([
        classesApi.list(),
        coursesApi.list({ pageSize: 50 }),
      ]);
      setItems(classList);
      setCourses(courseList.items);
      if (courseList.items.length > 0 && !selectedCourseId) {
        setSelectedCourseId(courseList.items[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load classes');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function openMeeting(id: string) {
    setError(null);
    setMessage(null);
    try {
      const session = await classesApi.meeting(id);
      setMessage(`Authorized meeting link: ${session.meetingUrl}`);
      if (session.meetingUrl) window.open(session.meetingUrl, '_blank', 'noopener,noreferrer');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Meeting access denied');
    }
  }

  async function notifyStudentsBeforeStart(classId: string, title: string) {
    setNotifyingId(classId);
    setError(null);
    setMessage(null);
    try {
      const res = await classesApi.notifyStart(classId);
      setMessage(`🔔 Class start alert sent! ${res.sentCount} enrolled student(s) notified for "${title}".`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to dispatch class notification');
    } finally {
      setNotifyingId(null);
    }
  }

  async function handleScheduleClass(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    setMessage(null);
    try {
      await classesApi.create({
        courseId: selectedCourseId,
        mentorId: user?.id,
        title: classTitle.trim(),
        scheduledAtUtc: new Date(scheduledAt).toISOString(),
        durationMinutes: duration,
      });

      setMessage('New live class session scheduled.');
      setClassTitle('');
      setShowScheduleForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule class');
    } finally {
      setCreating(false);
    }
  }

  const canManage = hasRole('Mentor') || hasRole('Admin') || hasRole('SuperAdmin');

  if (loading) return <Loading />;

  return (
    <div className="animate-rise">
      <div className="page-header">
        <div>
          <h1>Live Classes & Google Meet Sessions</h1>
          <p>
            Schedule sessions, launch meetings, and manually notify enrolled students before class starts.
          </p>
        </div>
        {canManage && (
          <button className="btn btn-primary" type="button" onClick={() => setShowScheduleForm((v) => !v)}>
            {showScheduleForm ? 'Close form' : '+ Schedule live class'}
          </button>
        )}
      </div>

      {message && <SuccessBox message={message} />}
      {error && <ErrorBox message={error} />}

      {showScheduleForm && canManage && (
        <form className="panel" onSubmit={handleScheduleClass} style={{ marginBottom: '1.25rem' }}>
          <h2>Schedule New Live Class</h2>
          <p style={{ color: 'var(--muted)', marginBottom: '1rem' }}>
            A secure Google Meet room will be generated automatically for this session.
          </p>
          <div className="grid-2">
            <div className="field">
              <label>Associated Course</label>
              <select value={selectedCourseId} onChange={(e) => setSelectedCourseId(e.target.value)} required>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.title} ({c.language})</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Class Session Title</label>
              <input
                value={classTitle}
                onChange={(e) => setClassTitle(e.target.value)}
                placeholder="e.g. Week 2 — Conversational Dialogue & Practice"
                required
              />
            </div>
          </div>
          <div className="grid-2">
            <div className="field">
              <label>Date & Time</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Duration (Minutes)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                min={15}
                max={240}
                required
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button className="btn btn-primary" type="submit" disabled={creating}>
              {creating ? 'Scheduling…' : 'Schedule class'}
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => setShowScheduleForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <Empty label="No classes scheduled." />
      ) : (
        <div className="panel">
          <table className="table">
            <thead>
              <tr>
                <th>Session Title</th>
                <th>Course</th>
                <th>Instructor</th>
                <th>Scheduled Time</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id}>
                  <td><strong>{c.title}</strong></td>
                  <td>{c.courseTitle}</td>
                  <td>{c.mentorName}</td>
                  <td>{new Date(c.scheduledAtUtc).toLocaleString()}</td>
                  <td><span className="badge">{enumLabel(c.status, CLASS_STATUS)}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      {canManage && (
                        <button
                          className="btn btn-primary"
                          type="button"
                          disabled={notifyingId === c.id}
                          onClick={() => void notifyStudentsBeforeStart(c.id, c.title)}
                          title="Send high-priority notification to all enrolled mobile students"
                        >
                          {notifyingId === c.id ? 'Sending…' : '🔔 Notify Students (Starting)'}
                        </button>
                      )}
                      <button className="btn btn-azure" type="button" onClick={() => void openMeeting(c.id)}>
                        Join Meet
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
