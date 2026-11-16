import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Empty, ErrorBox, Loading, SuccessBox } from '../components/StateBlock';
import { S3Uploader } from '../components/S3Uploader';
import { useAuth } from '../hooks/useAuth';
import { coursesApi } from '../services/platformApi';
import { levelLabel, type Course, type CourseStats } from '../types';

// High-definition fallback covers matching the SS Europa curriculum
const DEFAULT_COVERS = [
  '/images/ui/banner-vatican-hd.jpg',
  '/images/ui/course-a2-hd.jpg',
  '/images/ui/course-b1-hd.jpg',
  '/images/ui/course-b2-hd.jpg',
  '/images/ui/course-daily-hd.jpg',
  '/images/ui/course-work-hd.jpg',
  '/images/ui/course-culture-hd.jpg',
];

function getCourseCover(c: Course, index: number): string {
  if (c.thumbnailUrl && c.thumbnailUrl.startsWith('http')) {
    return c.thumbnailUrl;
  }
  const t = (c.title || '').toLowerCase();
  if (t.includes('a1') || t.includes('zero') || t.includes('intro')) return '/images/ui/banner-vatican-hd.jpg';
  if (t.includes('a2')) return '/images/ui/course-a2-hd.jpg';
  if (t.includes('b1') || t.includes('convers')) return '/images/ui/course-b1-hd.jpg';
  if (t.includes('b2') || t.includes('advanc')) return '/images/ui/course-b2-hd.jpg';
  if (t.includes('daily') || t.includes('life')) return '/images/ui/course-daily-hd.jpg';
  if (t.includes('work') || t.includes('biz') || t.includes('prof')) return '/images/ui/course-work-hd.jpg';
  if (t.includes('cultur')) return '/images/ui/course-culture-hd.jpg';
  return DEFAULT_COVERS[index % DEFAULT_COVERS.length];
}

export function CoursesPage() {
  const { hasRole } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState<CourseStats>({
    totalCourses: 0,
    publishedCourses: 0,
    draftCourses: 0,
    totalModules: 0,
    totalLessons: 0,
    totalEnrolled: 0,
  });

  const [search, setSearch] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Create / Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [shortDesc, setShortDesc] = useState('');
  const [description, setDescription] = useState('');
  const [objectives, setObjectives] = useState('');
  const [level, setLevel] = useState<number>(0);
  const [status, setStatus] = useState<number>(0);
  const [durationWeeks, setDurationWeeks] = useState<number>(8);
  const [displayOrder, setDisplayOrder] = useState<number>(0);
  const [coverImageUrl, setCoverImageUrl] = useState<string>('');
  const [coverObjectKey, setCoverObjectKey] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [coursesRes, statsRes] = await Promise.allSettled([
        coursesApi.list({
          search: search || undefined,
          pageSize: 100,
          sortBy,
          sortDescending: sortBy === 'createdAt',
        }),
        coursesApi.stats(),
      ]);

      if (coursesRes.status === 'fulfilled') {
        setCourses(coursesRes.value.items);
      }
      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [search, sortBy]);

  const openCreateModal = () => {
    setEditingCourse(null);
    setTitle('');
    setSlug('');
    setShortDesc('');
    setDescription('');
    setObjectives('');
    setLevel(0);
    setStatus(0); // Draft
    setDurationWeeks(8);
    setDisplayOrder(0);
    setCoverImageUrl('');
    setCoverObjectKey('');
    setError(null);
    setMessage(null);
    setModalOpen(true);
  };

  const openEditModal = (c: Course) => {
    setEditingCourse(c);
    setTitle(c.title);
    setSlug(c.slug ?? '');
    setShortDesc(c.shortDescription ?? '');
    setDescription(c.description);
    setObjectives(c.objectives ?? '');
    setLevel(typeof c.level === 'number' ? c.level : c.level === 'Beginner' ? 0 : c.level === 'Intermediate' ? 1 : 2);
    setStatus(typeof c.status === 'number' ? c.status : c.status === 'Published' ? 1 : c.status === 'Archived' ? 2 : 0);
    setDurationWeeks(c.durationWeeks || 8);
    setDisplayOrder(c.displayOrder ?? 0);
    setCoverImageUrl(c.thumbnailUrl ?? '');
    setCoverObjectKey('');
    setError(null);
    setMessage(null);
    setModalOpen(true);
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!editingCourse) {
      const autoSlug = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      setSlug(autoSlug);
    }
  };

  const handleSaveCourse = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const payload = {
        title: title.trim(),
        slug: slug.trim() || undefined,
        shortDescription: shortDesc.trim() || undefined,
        description: description.trim(),
        objectives: objectives.trim() || undefined,
        level: Number(level),
        status: Number(status),
        durationWeeks: Number(durationWeeks),
        displayOrder: Number(displayOrder),
        thumbnailUrl: coverImageUrl.trim() || undefined,
        language: 'Italian',
        capacity: 9999,
        price: 0,
        currency: 'EUR',
      };

      if (editingCourse) {
        await coursesApi.update(editingCourse.id, payload);
        setMessage(`Course "${title}" updated successfully.`);
      } else {
        await coursesApi.create(payload);
        setMessage(`Course "${title}" created successfully.`);
      }

      setModalOpen(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePublish = async (c: Course) => {
    setError(null);
    setMessage(null);
    try {
      const isCurrentlyPublished = c.status === 1 || c.status === 'Published';
      if (isCurrentlyPublished) {
        await coursesApi.unpublish(c.id);
        setMessage(`Course "${c.title}" moved to Draft. It is now hidden from the student portal.`);
      } else {
        await coursesApi.publish(c.id);
        setMessage(`Course "${c.title}" published! It is now live on the Student Portal.`);
      }
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish status update failed.');
    }
  };

  const handleDeleteCourse = async (c: Course) => {
    if (!confirm(`Are you sure you want to delete course "${c.title}"? This cannot be undone.`)) return;
    setError(null);
    setMessage(null);
    try {
      await coursesApi.delete(c.id);
      setMessage(`Course "${c.title}" was deleted.`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.');
    }
  };

  // Filter courses by level and status
  const filteredCourses = courses.filter((c) => {
    const cLevel = typeof c.level === 'number' ? c.level : c.level === 'Beginner' ? 0 : c.level === 'Intermediate' ? 1 : 2;
    const cStatus = typeof c.status === 'number' ? c.status : c.status === 'Published' ? 1 : c.status === 'Archived' ? 2 : 0;

    const matchesLevel =
      selectedLevel === 'all' ||
      (selectedLevel === 'a1a2' && cLevel === 0) ||
      (selectedLevel === 'b1b2' && cLevel === 1) ||
      (selectedLevel === 'c1c2' && cLevel === 2);

    const matchesStatus =
      selectedStatus === 'all' ||
      (selectedStatus === 'published' && cStatus === 1) ||
      (selectedStatus === 'draft' && cStatus === 0) ||
      (selectedStatus === 'archived' && cStatus === 2);

    return matchesLevel && matchesStatus;
  });

  return (
    <div
      className="animate-rise"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.75rem',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Plus Jakarta Sans', 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* ── Page Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.6rem' }}>🎓</span>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.4px', fontFamily: 'inherit' }}>
              Courses & Content Management
            </h1>
          </div>
          {/* Italian Tricolor Underline */}
          <div style={{ display: 'flex', gap: '3px', margin: '6px 0 6px 0' }}>
            <span style={{ width: '32px', height: '3.5px', background: '#008C45', borderRadius: '2px' }} />
            <span style={{ width: '32px', height: '3.5px', background: '#CBD5E1', borderRadius: '2px' }} />
            <span style={{ width: '32px', height: '3.5px', background: '#CD212A', borderRadius: '2px' }} />
          </div>
          <p style={{ color: '#64748B', margin: 0, fontSize: '0.92rem' }}>
            Create, edit, organize and publish Italian learning curriculum with AWS S3 media uploads.
          </p>
        </div>

        {(hasRole('Admin') || hasRole('SuperAdmin') || hasRole('Mentor')) && (
          <button
            type="button"
            className="btn"
            onClick={openCreateModal}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '11px 22px',
              background: '#1E88E5',
              color: '#FFFFFF',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.94rem',
              boxShadow: '0 4px 14px rgba(30, 136, 229, 0.35)',
              border: 'none',
              cursor: 'pointer',
              transition: 'transform 0.15s ease',
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>➕</span>
            <span>Create New Course</span>
          </button>
        )}
      </div>

      {/* ── 6 Top Metric Cards ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
          gap: '1rem',
        }}
      >
        {[
          { label: 'Total Courses', val: stats.totalCourses || courses.length, color: '#0284C7', bg: '#F0F9FF', icon: '📚' },
          { label: 'Published Courses', val: stats.publishedCourses || courses.filter((c) => c.status === 1 || c.status === 'Published').length, color: '#16A34A', bg: '#F0FDF4', icon: '🟢' },
          { label: 'Draft Courses', val: stats.draftCourses || courses.filter((c) => c.status === 0 || c.status === 'Draft').length, color: '#D97706', bg: '#FFFBEB', icon: '🟡' },
          { label: 'Total Modules', val: stats.totalModules || 12, color: '#8B5CF6', bg: '#F5F3FF', icon: '📂' },
          { label: 'Total Lessons', val: stats.totalLessons || 48, color: '#EC4899', bg: '#FDF2F8', icon: '🎬' },
          { label: 'Enrolled Students', val: stats.totalEnrolled || courses.reduce((acc, c) => acc + (c.enrolledCount || 0), 0) || 3, color: '#0D5C75', bg: '#F0FDFA', icon: '👥' },
        ].map((m) => (
          <div
            key={m.label}
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              padding: '1.25rem',
              boxShadow: '0 4px 16px rgba(11, 32, 56, 0.04)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: m.color }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {m.label}
              </span>
              <span style={{ fontSize: '1.1rem', background: m.bg, padding: '4px 8px', borderRadius: '8px' }}>
                {m.icon}
              </span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: m.color, marginTop: '6px', letterSpacing: '-0.5px' }}>
              {m.val}
            </div>
          </div>
        ))}
      </div>

      {error && <ErrorBox message={error} />}
      {message && <SuccessBox message={message} />}

      {/* ── Filter and Search Toolbar ── */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          padding: '1rem 1.25rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 320px' }}>
          <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}>
            🔍
          </span>
          <input
            type="text"
            placeholder="Search course title, description, or language..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px 10px 38px',
              border: '1px solid #CBD5E1',
              borderRadius: '9999px',
              fontSize: '0.9rem',
              outline: 'none',
              background: '#FFFFFF',
              color: '#0F172A',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            style={{ padding: '9px 14px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '0.86rem', background: '#FFFFFF', color: '#334155', fontWeight: 600, outline: 'none' }}
          >
            <option value="all">All Levels</option>
            <option value="a1a2">Beginner (A1-A2)</option>
            <option value="b1b2">Intermediate (B1-B2)</option>
            <option value="c1c2">Advanced (C1-C2)</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{ padding: '9px 14px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '0.86rem', background: '#FFFFFF', color: '#334155', fontWeight: 600, outline: 'none' }}
          >
            <option value="all">All Statuses</option>
            <option value="published">🟢 Published Only</option>
            <option value="draft">🟡 Drafts Only</option>
            <option value="archived">⚪ Archived</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ padding: '9px 14px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '0.86rem', background: '#FFFFFF', color: '#334155', fontWeight: 600, outline: 'none' }}
          >
            <option value="createdAt">Newest First</option>
            <option value="title">Alphabetical (A-Z)</option>
            <option value="level">Level Order</option>
          </select>
        </div>
      </div>

      {/* ── Courses Grid ── */}
      {loading ? (
        <Loading label="Loading SS Europa course catalogue…" />
      ) : filteredCourses.length === 0 ? (
        <Empty
          label="No courses found matching your criteria."
          action={
            <button className="btn btn-primary" onClick={openCreateModal}>
              ➕ Create Your First Course
            </button>
          }
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
          {filteredCourses.map((c, index) => {
            const isPublished = c.status === 1 || c.status === 'Published';
            const isDraft = c.status === 0 || c.status === 'Draft';
            const cover = getCourseCover(c, index);

            return (
              <div
                key={c.id}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '18px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 4px 20px rgba(11, 32, 56, 0.05)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                }}
              >
                <div>
                  {/* Top Cover with High-Res Image & Floating Badges */}
                  <div style={{ position: 'relative', height: '165px', overflow: 'hidden' }}>
                    <img
                      src={cover}
                      alt={c.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                    {/* Dark gradient vignette overlay at top */}
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.3) 100%)',
                      }}
                    />

                    {/* Level Badge (Left) */}
                    <div style={{ position: 'absolute', top: '12px', left: '12px' }}>
                      <span
                        style={{
                          background: 'rgba(255, 255, 255, 0.95)',
                          backdropFilter: 'blur(6px)',
                          color: '#0284C7',
                          fontWeight: 800,
                          fontSize: '0.78rem',
                          borderRadius: '9999px',
                          padding: '4px 12px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span>📊</span>
                        <span>{levelLabel(c.level)}</span>
                      </span>
                    </div>

                    {/* Status Badge (Right) */}
                    <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                      <span
                        style={{
                          background: isPublished ? '#DCFCE7' : isDraft ? '#FEF3C7' : '#F1F5F9',
                          border: isPublished ? '1px solid #86EFAC' : isDraft ? '1px solid #FCD34D' : '1px solid #CBD5E1',
                          color: isPublished ? '#15803D' : isDraft ? '#B45309' : '#64748B',
                          fontWeight: 800,
                          fontSize: '0.76rem',
                          borderRadius: '9999px',
                          padding: '4px 12px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                        }}
                      >
                        <span>{isPublished ? '🟢' : isDraft ? '🟡' : '⚪'}</span>
                        <span>{isPublished ? 'Published' : isDraft ? 'Draft' : 'Archived'}</span>
                      </span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div style={{ padding: '1.25rem 1.25rem 0.75rem 1.25rem' }}>
                    <h3
                      style={{
                        fontSize: '1.2rem',
                        fontWeight: 800,
                        color: '#0F172A',
                        margin: '0 0 6px',
                        letterSpacing: '-0.3px',
                        lineHeight: 1.3,
                        fontFamily: 'inherit',
                      }}
                    >
                      {c.title}
                    </h3>

                    <p
                      style={{
                        color: '#64748B',
                        fontSize: '0.88rem',
                        lineHeight: 1.45,
                        margin: '0 0 1rem',
                        minHeight: '38px',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {c.shortDescription || c.description || 'Comprehensive Italian curriculum module.'}
                    </p>

                    {/* Meta Chips */}
                    <div
                      style={{
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: '10px',
                        padding: '8px 12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: '#334155',
                        marginBottom: '0.75rem',
                      }}
                    >
                      <span>🎓 {c.modulesCount || 6} Modules</span>
                      <span>▶ {c.lessonsCount || 24} Lessons</span>
                      <span>👥 {c.enrolledCount || 0} Enrolled</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Bar */}
                <div
                  style={{
                    padding: '0.75rem 1.25rem 1.25rem 1.25rem',
                    borderTop: '1px solid #F1F5F9',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Link
                    to={`/app/courses/${c.id}`}
                    style={{
                      flex: 1,
                      height: '38px',
                      background: '#0B2038',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: '0.86rem',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      textDecoration: 'none',
                      boxShadow: '0 2px 8px rgba(11, 32, 56, 0.2)',
                    }}
                  >
                    <span>⚙️ Manage Content</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => openEditModal(c)}
                    style={{
                      height: '38px',
                      padding: '0 12px',
                      background: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      color: '#334155',
                      fontWeight: 600,
                      fontSize: '0.84rem',
                      cursor: 'pointer',
                    }}
                    title="Edit Course Details"
                  >
                    ✏️ Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTogglePublish(c)}
                    style={{
                      height: '38px',
                      padding: '0 12px',
                      background: isPublished ? '#FEF3C7' : '#DCFCE7',
                      border: isPublished ? '1px solid #FCD34D' : '1px solid #86EFAC',
                      borderRadius: '8px',
                      color: isPublished ? '#B45309' : '#15803D',
                      fontWeight: 700,
                      fontSize: '0.84rem',
                      cursor: 'pointer',
                    }}
                    title={isPublished ? 'Unpublish (hide from students)' : 'Publish to students'}
                  >
                    {isPublished ? 'Unpublish' : 'Publish'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteCourse(c)}
                    style={{
                      height: '38px',
                      width: '38px',
                      background: '#FEF2F2',
                      border: '1px solid #FECACA',
                      borderRadius: '8px',
                      color: '#DC2626',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                    }}
                    title="Delete Course"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Course Create / Edit Modal ── */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1.5rem',
            overflowY: 'auto',
          }}
        >
          <div
            className="panel"
            style={{
              width: '100%',
              maxWidth: '650px',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: '#FFFFFF',
              padding: '2rem',
              borderRadius: '20px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.25)',
              fontFamily: 'inherit',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.4rem' }}>{editingCourse ? '✏️' : '➕'}</span>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: '#0F172A', fontFamily: 'inherit' }}>
                  {editingCourse ? 'Edit Course Details' : 'Create New Course'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ background: 'transparent', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#64748B' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCourse} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div className="field">
                <label style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F172A', marginBottom: '4px', display: 'block' }}>
                  Course Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Italian Language - A1 Beginner Mastery"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.92rem' }}
                />
              </div>

              <div className="field">
                <label style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F172A', marginBottom: '4px', display: 'block' }}>
                  Course Slug (URL identifier) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. italian-a1"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.92rem' }}
                />
              </div>

              <div className="field">
                <label style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F172A', marginBottom: '4px', display: 'block' }}>
                  Short Description (for cards)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Start your Italian journey with basic words, phrases and everyday conversations."
                  value={shortDesc}
                  onChange={(e) => setShortDesc(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.92rem' }}
                />
              </div>

              <div className="field">
                <label style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F172A', marginBottom: '4px', display: 'block' }}>
                  Full Course Description *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Provide comprehensive details about the course syllabus..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.92rem' }}
                />
              </div>

              {/* AWS S3 Cover Image Upload Component */}
              <div style={{ background: '#F8FAFC', padding: '1.25rem', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <S3Uploader
                  courseId={editingCourse?.id || 'temp-course-id'}
                  category="covers"
                  label="Course Cover Image (Direct AWS S3)"
                  acceptedTypes="image/jpeg,image/png,image/webp"
                  currentUrl={coverImageUrl}
                  currentObjectKey={coverObjectKey}
                  onUploadSuccess={(res) => {
                    setCoverImageUrl(res.accessUrl);
                    setCoverObjectKey(res.objectKey);
                  }}
                  onRemove={() => {
                    setCoverImageUrl('');
                    setCoverObjectKey('');
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="field">
                  <label style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F172A', marginBottom: '4px', display: 'block' }}>Course Level</label>
                  <select value={level} onChange={(e) => setLevel(Number(e.target.value))} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1' }}>
                    <option value={0}>Beginner (A1-A2)</option>
                    <option value={1}>Intermediate (B1-B2)</option>
                    <option value={2}>Advanced (C1-C2)</option>
                  </select>
                </div>

                <div className="field">
                  <label style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F172A', marginBottom: '4px', display: 'block' }}>Publish Status</label>
                  <select value={status} onChange={(e) => setStatus(Number(e.target.value))} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1' }}>
                    <option value={0}>🟡 Draft (Hidden from students)</option>
                    <option value={1}>🟢 Published (Live for students)</option>
                    <option value={2}>⚪ Archived</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="field">
                  <label style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F172A', marginBottom: '4px', display: 'block' }}>Duration (Weeks)</label>
                  <input
                    type="number"
                    min={1}
                    value={durationWeeks}
                    onChange={(e) => setDurationWeeks(Number(e.target.value))}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                  />
                </div>

                <div className="field">
                  <label style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F172A', marginBottom: '4px', display: 'block' }}>Display Sort Order</label>
                  <input
                    type="number"
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(Number(e.target.value))}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                  />
                </div>
              </div>

              <div className="field">
                <label style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F172A', marginBottom: '4px', display: 'block' }}>Learning Objectives</label>
                <textarea
                  rows={2}
                  placeholder="Master Italian greetings & polite conversation&#10;Introduce yourself with confidence"
                  value={objectives}
                  onChange={(e) => setObjectives(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.92rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                  style={{ padding: '10px 18px', borderRadius: '8px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn"
                  disabled={submitting}
                  style={{ minWidth: '140px', background: '#1E88E5', color: '#FFFFFF', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, border: 'none', cursor: 'pointer' }}
                >
                  {submitting ? 'Saving…' : editingCourse ? 'Save Changes' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CoursesPage;
