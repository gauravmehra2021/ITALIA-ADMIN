import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { Alert, EmptyState, PageHeader, Spinner, StatCard } from '../components/ui';
import { coursesApi } from '../services/platformApi';
import { mediaUrl } from '../services/api';
import { CourseForm, CATEGORIES } from '../components/builder/CourseForm';
import { Modal, StatusBadge } from '../components/builder/BuilderKit';
import { useAuth } from '../hooks/useAuth';
import type { Course } from '../types';
import '../components/builder/builder.css';

const statusName = (s: Course['status']) => (typeof s === 'number' ? ['Draft', 'Published', 'Archived'][s] ?? 'Draft' : s);
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

type Filter = 'All' | 'Published' | 'Draft';

export function CoursesPage() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const canCreate = can('courses', 'Full');
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('All');
  const [search, setSearch] = useState('');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await coursesApi.list({ pageSize: 100 });
      setCourses(res.items.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.title.localeCompare(b.title)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load courses.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function togglePublish(c: Course) {
    setBusyId(c.id);
    setError(null);
    try {
      const updated = statusName(c.status) === 'Published' ? await coursesApi.unpublish(c.id) : await coursesApi.publish(c.id);
      setCourses((list) => list.map((x) => (x.id === c.id ? { ...x, ...updated } : x)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not change the course status.');
    } finally {
      setBusyId(null);
    }
  }

  const counts = {
    All: courses.length,
    Published: courses.filter((c) => statusName(c.status) === 'Published').length,
    Draft: courses.filter((c) => statusName(c.status) === 'Draft').length,
  };
  const totals = {
    lessons: courses.reduce((n, c) => n + (c.lessonsCount ?? 0), 0),
    units: courses.reduce((n, c) => n + (c.modulesCount ?? 0), 0),
    students: courses.reduce((n, c) => n + (c.enrolledCount ?? 0), 0),
  };

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return courses.filter(
      (c) => (filter === 'All' || statusName(c.status) === filter) && (!q || [c.title, c.shortDescription, c.cefrLevel, c.category].some((v) => v?.toLowerCase().includes(q))),
    );
  }, [courses, filter, search]);

  return (
    <div className="page">
      <PageHeader
        title="Courses & Content"
        subtitle="Each course is made of weekly units. Each unit has short lessons with words, a dialogue or grammar, pictures, audio and practice."
        actions={canCreate && (
          <button className="btn btn-primary" onClick={() => setCreating(true)}><Icon.Plus size={18} /> New course</button>
        )}
      />

      {error && <Alert tone="error" onClose={() => setError(null)}>{error}</Alert>}

      <div className="stats">
        <StatCard icon="Book" tone="blue" label="Courses" value={courses.length} hint={`${counts.Published} published`} />
        <StatCard icon="Layers" tone="purple" label="Units" value={totals.units} />
        <StatCard icon="Target" tone="orange" label="Lessons" value={totals.lessons} />
        <StatCard icon="Cap" tone="green" label="Enrolled students" value={totals.students} />
      </div>

      <div className="toolbar">
        <div className="chips">
          {(['All', 'Published', 'Draft'] as Filter[]).map((f) => (
            <button key={f} type="button" className={`chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f} <span className="count">{counts[f]}</span>
            </button>
          ))}
        </div>
        <label className="search">
          <Icon.Search size={17} />
          <input className="input" type="search" placeholder="Search courses…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
      </div>

      {loading ? (
        <Spinner label="Loading courses…" />
      ) : visible.length === 0 ? (
        <section className="card">
          <EmptyState
            icon="Book"
            title={courses.length === 0 ? 'No courses yet' : 'No courses match'}
            text={courses.length === 0 ? 'Create your first course, then add units and lessons in the builder.' : 'Try another filter or search word.'}
            action={courses.length === 0 && canCreate ? <button className="btn btn-primary btn-sm" onClick={() => setCreating(true)}><Icon.Plus size={16} /> Create a course</button> : undefined}
          />
        </section>
      ) : (
        <div className="b-course-grid">
          {visible.map((c) => {
            const cover = mediaUrl(c.thumbnailUrl);
            const status = statusName(c.status);
            const cat = CATEGORIES.find((x) => x.id === c.category)?.label.replace(' (CEFR level)', '') ?? 'Core course';
            return (
              <article key={c.id} className="b-card b-course">
                <Link to={`/app/courses/${c.id}`} className={`b-course-cover cat-${c.category ?? 'Core'}`} aria-label={`Open ${c.title}`}>
                  <span className="b-badge">{c.cefrLevel ?? 'A1'} · {cat}</span>
                  {cover ? <img src={cover} alt="" /> : <Icon.Book size={56} color="#fff" />}
                </Link>
                <div className="b-course-body">
                  <div className="b-between">
                    <StatusBadge status={status} />
                    {c.mentorName && <span className="b-muted b-small b-row" style={{ gap: 4 }}><Icon.Cap size={14} /> {c.mentorName}</span>}
                  </div>
                  <h3>{c.title}</h3>
                  <p>{c.shortDescription || c.description}</p>
                  <div className="b-course-meta">
                    <span><Icon.Layers size={14} /> {plural(c.modulesCount ?? 0, 'unit')}</span>
                    <span><Icon.Target size={14} /> {plural(c.lessonsCount ?? 0, 'lesson')}</span>
                    <span><Icon.Users size={14} /> {plural(c.enrolledCount ?? 0, 'student')}</span>
                  </div>
                  <div className="b-course-foot">
                    <button className="btn btn-secondary btn-sm" onClick={() => void togglePublish(c)} disabled={busyId === c.id}>
                      {status === 'Published' ? 'Unpublish' : 'Publish'}
                    </button>
                    <Link to={`/app/courses/${c.id}`} className="btn btn-primary btn-sm">
                      Open builder <Icon.ArrowRight size={15} />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {creating && (
        <Modal title="New course" onClose={() => setCreating(false)} wide>
          <CourseForm onCancel={() => setCreating(false)} onSaved={(c) => { setCreating(false); navigate(`/app/courses/${c.id}`); }} />
        </Modal>
      )}
    </div>
  );
}
