import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Empty, ErrorBox, Loading, SuccessBox } from '../components/StateBlock';
import { useAuth } from '../hooks/useAuth';
import { coursesApi, subscriptionsApi } from '../services/platformApi';
import { levelLabel, statusLabel, type Course } from '../types';

export function CoursesPage() {
  const { hasRole } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function load(q = search) {
    setLoading(true);
    setError(null);
    try {
      const result = await coursesApi.list({ search: q || undefined, pageSize: 20, sortBy: 'title' });
      setCourses(result.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function enroll(id: string) {
    setMessage(null);
    setError(null);
    try {
      await coursesApi.enroll(id);
      setMessage('Enrolled successfully.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enrollment failed');
    }
  }

  async function subscribe(id: string) {
    setMessage(null);
    setError(null);
    try {
      const sub = await subscriptionsApi.create(id, 'Monthly Plan');
      setMessage(`Mock PayPal subscription activated (${sub.payPalSubscriptionId}).`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Subscription failed');
    }
  }

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    setMessage(null);
    try {
      await coursesApi.create({
        title: form.get('title'),
        description: form.get('description'),
        level: Number(form.get('level')),
        capacity: Number(form.get('capacity')),
        mentorId: null,
        language: 'Italian',
        price: Number(form.get('price')),
        currency: 'EUR',
        durationWeeks: Number(form.get('durationWeeks')),
      });
      setMessage('Course created as draft.');
      setCreating(false);
      e.currentTarget.reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    }
  }

  return (
    <div className="animate-rise">
      <div className="page-header">
        <div>
          <h1>Course Curriculum & Catalogue</h1>
          <p>Create and edit courses, author lesson materials (videos, audios, PDFs), and manage student capacity.</p>
        </div>
        {(hasRole('Admin') || hasRole('SuperAdmin') || hasRole('Mentor')) && (
          <button className="btn btn-primary" type="button" onClick={() => setCreating((v) => !v)}>
            {creating ? 'Close form' : '+ New course'}
          </button>
        )}
      </div>

      {message && <SuccessBox message={message} />}
      {error && <ErrorBox message={error} />}

      <form
        className="panel"
        style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', alignItems: 'end' }}
        onSubmit={(e) => {
          e.preventDefault();
          void load(search);
        }}
      >
        <div className="field" style={{ flex: 1, marginBottom: 0 }}>
          <label htmlFor="search">Search</label>
          <input id="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Italian, grammar…" />
        </div>
        <button className="btn btn-secondary" type="submit">Filter</button>
      </form>

      {creating && (
        <form className="panel" style={{ marginBottom: '1rem' }} onSubmit={onCreate}>
          <h2 style={{ marginBottom: '0.75rem' }}>Create course</h2>
          <div className="grid-2">
            <div className="field"><label>Title</label><input name="title" required /></div>
            <div className="field">
              <label>Level</label>
              <select name="level" defaultValue={0}>
                <option value={0}>Beginner</option>
                <option value={1}>Intermediate</option>
                <option value={2}>Advanced</option>
              </select>
            </div>
          </div>
          <div className="field"><label>Description</label><textarea name="description" rows={3} required /></div>
          <div className="grid-3">
            <div className="field"><label>Capacity</label><input name="capacity" type="number" defaultValue={25} required /></div>
            <div className="field"><label>Price (€)</label><input name="price" type="number" defaultValue={49} required /></div>
            <div className="field"><label>Weeks</label><input name="durationWeeks" type="number" defaultValue={8} required /></div>
          </div>
          <button className="btn btn-azure" type="submit">Save draft</button>
        </form>
      )}

      {loading ? (
        <Loading />
      ) : courses.length === 0 ? (
        <Empty label="No courses match your filters." />
      ) : (
        <div className="grid-2">
          {courses.map((course) => (
            <article key={course.id} className="panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                <h2 style={{ fontSize: '1.25rem' }}>{course.title}</h2>
                <span className="badge">{levelLabel(course.level)}</span>
              </div>
              <p style={{ color: 'var(--muted)' }}>{course.description}</p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
                <span className="badge">{statusLabel(course.status)}</span>
                <span className="badge">{course.language}</span>
                <span className="badge">€{course.price}</span>
                <span className="badge">{course.enrolledCount}/{course.capacity} enrolled</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <Link className="btn btn-secondary" to={`/app/courses/${course.id}`}>Open</Link>
                <button className="btn btn-primary" type="button" onClick={() => void enroll(course.id)}>Enroll</button>
                <button className="btn btn-azure" type="button" onClick={() => void subscribe(course.id)}>Subscribe (mock)</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
