import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Empty, ErrorBox, Loading, SuccessBox } from '../components/StateBlock';
import { useAuth } from '../hooks/useAuth';
import { coursesApi } from '../services/platformApi';
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
      const result = await coursesApi.list({ search: q || undefined, pageSize: 50, sortBy: 'createdAt', sortDescending: true });
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

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formElement = e.currentTarget;
    const form = new FormData(formElement);
    setError(null);
    setMessage(null);
    try {
      const created = await coursesApi.create({
        title: form.get('title'),
        description: form.get('description'),
        level: Number(form.get('level')),
        capacity: 9999,
        mentorId: null,
        language: 'Italian',
        price: 0,
        currency: 'EUR',
        durationWeeks: 0,
        thumbnailUrl: form.get('thumbnailUrl')?.toString().trim() || undefined,
      });
      setMessage('Course created successfully.');
      setCreating(false);
      if (created && created.id) {
        setCourses((prev) => [created, ...prev.filter((c) => c.id !== created.id)]);
      }
      try {
        formElement.reset();
      } catch {
        // safely ignore
      }
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
          <p>Create and manage courses and chapters. All courses are included in the single App All-Access Membership.</p>
        </div>
        {(hasRole('Admin') || hasRole('SuperAdmin') || hasRole('Mentor')) && (
          <button className="btn btn-primary" type="button" onClick={() => setCreating((v) => !v)}>
            {creating ? 'Close form' : '+ New course'}
          </button>
        )}
      </div>

      <div className="panel" style={{ marginBottom: '1.25rem', borderLeft: '4px solid #0D5C75' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>💎 Single All-Access App Membership</h2>
            <p style={{ color: 'var(--muted)', margin: '0.2rem 0 0', fontSize: '0.85rem' }}>
              Students make one single payment to unlock every course, video tutorial, and live session across the app.
            </p>
          </div>
          <span className="badge badge-success" style={{ padding: '0.35rem 0.75rem', fontWeight: 600 }}>
            All Courses Included in 1 Payment
          </span>
        </div>
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
          <p style={{ color: 'var(--muted)', marginBottom: '1rem', fontSize: '0.85rem' }}>
            Enter course details. Courses are unlimited capacity and included in the full app pass.
          </p>
          <div className="grid-2">
            <div className="field">
              <label>Course Title</label>
              <input name="title" placeholder="e.g. Italian Essentials A1" required />
            </div>
            <div className="field">
              <label>Level</label>
              <select name="level" defaultValue={0}>
                <option value={0}>Beginner</option>
                <option value={1}>Intermediate</option>
                <option value={2}>Advanced</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label>Thumbnail / Image URL (Optional)</label>
            <input name="thumbnailUrl" placeholder="https://example.com/course-cover.jpg or leave blank" />
          </div>
          <div className="field">
            <label>Description</label>
            <textarea name="description" rows={3} placeholder="Overview of the course topics, chapters, and practical tasks..." required />
          </div>
          <button className="btn btn-azure" type="submit">Save Course</button>
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
                <span className="badge badge-success">All-Access Included</span>
                <span className="badge">{course.enrolledCount} active students</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <Link className="btn btn-secondary" to={`/app/courses/${course.id}`}>Open</Link>
                <button className="btn btn-primary" type="button" onClick={() => void enroll(course.id)}>Enroll</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
