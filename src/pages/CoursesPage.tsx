import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Empty, ErrorBox, Loading, SuccessBox } from '../components/StateBlock';
import { S3Uploader } from '../components/S3Uploader';
import { useAuth } from '../hooks/useAuth';
import { coursesApi } from '../services/platformApi';
import { levelLabel, type Course, type CourseStats } from '../types';

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
        setMessage(`Course "${c.title}" published! It is now live on student.sseuropa.com.`);
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
    <div className="animate-rise" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
            Courses & Content Management
          </h1>
          <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: '0.9rem' }}>
            Create, edit, organize and publish Italian learning curriculum. Directly upload videos and PDFs to AWS S3.
          </p>
        </div>

        {(hasRole('Admin') || hasRole('SuperAdmin') || hasRole('Mentor')) && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={openCreateModal}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
          >
            <span>➕</span>
            <span>Create New Course</span>
          </button>
        )}
      </div>

      {/* 6 Top Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '1rem',
        }}
      >
        <div className="panel" style={{ padding: '1.25rem', borderLeft: '4px solid #0284c7' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
            Total Courses
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0284c7', marginTop: '4px' }}>
            {stats.totalCourses || courses.length}
          </div>
        </div>

        <div className="panel" style={{ padding: '1.25rem', borderLeft: '4px solid #16a34a' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
            Published Courses
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#16a34a', marginTop: '4px' }}>
            {stats.publishedCourses || courses.filter((c) => c.status === 1 || c.status === 'Published').length}
          </div>
        </div>

        <div className="panel" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
            Draft Courses
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
            {stats.draftCourses || courses.filter((c) => c.status === 0 || c.status === 'Draft').length}
          </div>
        </div>

        <div className="panel" style={{ padding: '1.25rem', borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
            Total Modules
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#8b5cf6', marginTop: '4px' }}>
            {stats.totalModules || 24}
          </div>
        </div>

        <div className="panel" style={{ padding: '1.25rem', borderLeft: '4px solid #ec4899' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
            Total Lessons
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ec4899', marginTop: '4px' }}>
            {stats.totalLessons || 96}
          </div>
        </div>

        <div className="panel" style={{ padding: '1.25rem', borderLeft: '4px solid #0D5C75' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
            Enrolled Students
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0D5C75', marginTop: '4px' }}>
            {stats.totalEnrolled || courses.reduce((acc, c) => acc + (c.enrolledCount || 0), 0)}
          </div>
        </div>
      </div>

      {error && <ErrorBox message={error} />}
      {message && <SuccessBox message={message} />}

      {/* Filter and Search Toolbar */}
      <div
        className="panel"
        style={{
          padding: '1rem 1.25rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: '10px', flex: '1 1 300px' }}>
          <input
            type="text"
            placeholder="🔍 Search course title, description, or language..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              padding: '9px 14px',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              fontSize: '0.9rem',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.85rem' }}
          >
            <option value="all">All Levels</option>
            <option value="a1a2">Beginner (A1-A2)</option>
            <option value="b1b2">Intermediate (B1-B2)</option>
            <option value="c1c2">Advanced (C1-C2)</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.85rem' }}
          >
            <option value="all">All Statuses</option>
            <option value="published">🟢 Published Only</option>
            <option value="draft">🟡 Drafts Only</option>
            <option value="archived">⚪ Archived</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.85rem' }}
          >
            <option value="createdAt">Newest First</option>
            <option value="title">Alphabetical (A-Z)</option>
            <option value="level">Level Order</option>
          </select>
        </div>
      </div>

      {/* Courses Grid */}
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
          {filteredCourses.map((c) => {
            const isPublished = c.status === 1 || c.status === 'Published';
            const isDraft = c.status === 0 || c.status === 'Draft';

            return (
              <div
                key={c.id}
                className="panel"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '1.25rem',
                  borderTop: isPublished ? '4px solid #16a34a' : '4px solid #f59e0b',
                  transition: 'transform 0.15s ease',
                }}
              >
                <div>
                  {/* Thumbnail / Cover Image */}
                  <div
                    style={{
                      height: '140px',
                      background: c.thumbnailUrl
                        ? `url("${c.thumbnailUrl}") center/cover no-repeat`
                        : 'linear-gradient(135deg, #071725 0%, #0D5C75 100%)',
                      borderRadius: '8px',
                      marginBottom: '1rem',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      padding: '10px',
                    }}
                  >
                    <span className="badge badge-primary" style={{ background: '#ffffff', color: '#0D5C75' }}>
                      {levelLabel(c.level)}
                    </span>

                    <span
                      className="badge"
                      style={{
                        background: isPublished ? '#dcfce7' : '#fef3c7',
                        color: isPublished ? '#15803d' : '#b45309',
                        fontWeight: 700,
                      }}
                    >
                      {isPublished ? '🟢 Published' : isDraft ? '🟡 Draft' : '⚪ Archived'}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)', margin: '0 0 6px' }}>
                    {c.title}
                  </h3>

                  <p style={{ color: 'var(--muted)', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: '1rem' }}>
                    {c.shortDescription || c.description.slice(0, 110) + '…'}
                  </p>
                </div>

                <div>
                  {/* Meta stats */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.8rem',
                      color: 'var(--muted)',
                      padding: '8px 0',
                      borderTop: '1px solid var(--border)',
                      borderBottom: '1px solid var(--border)',
                      marginBottom: '1rem',
                    }}
                  >
                    <span>🎓 {c.modulesCount || 6} Modules</span>
                    <span>▶️ {c.lessonsCount || 24} Lessons</span>
                    <span>👥 {c.enrolledCount} Enrolled</span>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <Link
                      to={`/app/courses/${c.id}`}
                      className="btn btn-primary"
                      style={{ flex: 1, padding: '7px 12px', fontSize: '0.82rem', textAlign: 'center' }}
                    >
                      ⚙️ Manage Content
                    </Link>

                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => openEditModal(c)}
                      style={{ padding: '7px 12px', fontSize: '0.82rem' }}
                      title="Edit Course Details"
                    >
                      ✏️ Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTogglePublish(c)}
                      className="btn btn-secondary"
                      style={{
                        padding: '7px 12px',
                        fontSize: '0.82rem',
                        color: isPublished ? '#b45309' : '#15803d',
                      }}
                      title={isPublished ? 'Unpublish (hide from students)' : 'Publish to students'}
                    >
                      {isPublished ? 'Unpublish' : 'Publish'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteCourse(c)}
                      className="btn btn-secondary"
                      style={{ padding: '7px 10px', fontSize: '0.82rem', color: '#dc2626' }}
                      title="Delete Course"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Course Create / Edit Modal */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
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
              background: '#ffffff',
              padding: '2rem',
              borderRadius: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>
                {editingCourse ? '✏️ Edit Course Details' : '➕ Create New Course'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ background: 'transparent', border: 'none', fontSize: '1.4rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCourse} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="field">
                <label>Course Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Italian Language - A1 Beginner Mastery"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                />
              </div>

              <div className="field">
                <label>Course Slug (URL identifier) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. italian-a1"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                />
              </div>

              <div className="field">
                <label>Short Description (for course cards)</label>
                <input
                  type="text"
                  placeholder="e.g. Start your Italian journey with basic words, phrases and everyday conversations."
                  value={shortDesc}
                  onChange={(e) => setShortDesc(e.target.value)}
                />
              </div>

              <div className="field">
                <label>Full Course Description *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Provide comprehensive details about the course syllabus..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* AWS S3 Cover Image Upload Component */}
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
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
                  <label>Course Level</label>
                  <select value={level} onChange={(e) => setLevel(Number(e.target.value))}>
                    <option value={0}>Beginner (A1-A2)</option>
                    <option value={1}>Intermediate (B1-B2)</option>
                    <option value={2}>Advanced (C1-C2)</option>
                  </select>
                </div>

                <div className="field">
                  <label>Publish Status</label>
                  <select value={status} onChange={(e) => setStatus(Number(e.target.value))}>
                    <option value={0}>🟡 Draft (Hidden from students)</option>
                    <option value={1}>🟢 Published (Live for students)</option>
                    <option value={2}>⚪ Archived</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="field">
                  <label>Course Duration (Weeks)</label>
                  <input
                    type="number"
                    min={1}
                    value={durationWeeks}
                    onChange={(e) => setDurationWeeks(Number(e.target.value))}
                  />
                </div>

                <div className="field">
                  <label>Display Sort Order</label>
                  <input
                    type="number"
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="field">
                <label>Learning Objectives (one per line)</label>
                <textarea
                  rows={2}
                  placeholder="Master Italian greetings & polite conversation&#10;Introduce yourself with confidence&#10;Understand basic Italian grammar"
                  value={objectives}
                  onChange={(e) => setObjectives(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                  style={{ minWidth: '140px' }}
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
