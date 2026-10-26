import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Empty, ErrorBox, Loading, SuccessBox } from '../components/StateBlock';
import { useAuth } from '../hooks/useAuth';
import { assessmentsApi, coursesApi, materialsApi } from '../services/platformApi';
import { levelLabel, statusLabel, type Assessment, type Course, type Material } from '../types';

export function CourseDetailPage() {
  const { id } = useParams();
  const { hasRole } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newType, setNewType] = useState<number>(1); // 1 = Video, 2 = Audio, 0 = PDF, 3 = Worksheet
  const [newSortOrder, setNewSortOrder] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const c = await coursesApi.get(id);
      setCourse(c);
      try {
        setMaterials(await materialsApi.byCourse(id));
      } catch {
        setMaterials([]);
      }
      setAssessments(await assessmentsApi.list().then((all) => all.filter((a) => a.courseId === id)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load course');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [id]);

  async function handleAddMaterial(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      await materialsApi.create({
        courseId: id,
        title: newTitle.trim(),
        description: newDescription.trim(),
        type: Number(newType),
        sortOrder: Number(newSortOrder),
      });

      setMessage('New material added successfully! It is now visible to students on their mobile app.');
      setNewTitle('');
      setNewDescription('');
      setShowAddForm(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add content');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteMaterial(matId: string) {
    if (!confirm('Are you sure you want to remove this content?')) return;
    setError(null);
    setMessage(null);
    try {
      await materialsApi.delete(matId);
      setMessage('Material removed.');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete material');
    }
  }

  const canManage = hasRole('Mentor') || hasRole('Admin') || hasRole('SuperAdmin');

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} />;
  if (!course) return <Empty label="Course not found." />;

  const getMaterialIcon = (type: string | number) => {
    const t = Number(type);
    switch (t) {
      case 1: return '🎬 Video';
      case 2: return '🎧 Audio';
      case 0: return '📄 PDF';
      case 3: return '📝 Worksheet';
      default: return '📁 Resource';
    }
  };

  return (
    <div className="animate-rise">
      <div className="page-header">
        <div>
          <h1>{course.title}</h1>
          <p>{course.description}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {canManage && (
            <button className="btn btn-primary" type="button" onClick={() => setShowAddForm((v) => !v)}>
              {showAddForm ? 'Close form' : '+ Add lesson content'}
            </button>
          )}
          <Link className="btn btn-secondary" to="/app/courses">Back to courses</Link>
        </div>
      </div>

      {message && <SuccessBox message={message} />}
      {error && <ErrorBox message={error} />}

      <div className="grid-3" style={{ marginBottom: '1.25rem' }}>
        <div className="stat"><span>Level</span><strong style={{ fontSize: '1.2rem' }}>{levelLabel(course.level)}</strong></div>
        <div className="stat"><span>Status</span><strong style={{ fontSize: '1.2rem' }}>{statusLabel(course.status)}</strong></div>
        <div className="stat"><span>Instructor</span><strong style={{ fontSize: '1.2rem' }}>{course.mentorName ?? 'TBA'}</strong></div>
      </div>

      {showAddForm && canManage && (
        <form className="panel" onSubmit={handleAddMaterial} style={{ marginBottom: '1.25rem' }}>
          <h2>Add Lesson Content for Mobile Students</h2>
          <p style={{ color: 'var(--muted)', marginBottom: '1rem' }}>
            Instructors and admins can upload videos, audio pronunciation guides, PDFs, and interactive worksheets.
          </p>
          <div className="grid-2">
            <div className="field">
              <label>Content Title</label>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Conversation Dialogues & Vocabulary Lab"
                required
              />
            </div>
            <div className="field">
              <label>Content Type</label>
              <select value={newType} onChange={(e) => setNewType(Number(e.target.value))}>
                <option value={1}>🎬 Video Lecture / Scene</option>
                <option value={2}>🎧 Audio Listening / Pronunciation</option>
                <option value={0}>📄 PDF Workbook / Cheat Sheet</option>
                <option value={3}>📝 Interactive Worksheet</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label>Description & Learning Objectives</label>
            <textarea
              rows={3}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Explain key takeaways or instructions for students..."
              required
            />
          </div>
          <div className="grid-2">
            <div className="field">
              <label>Display Sequence (Sort Order)</label>
              <input
                type="number"
                value={newSortOrder}
                onChange={(e) => setNewSortOrder(Number(e.target.value))}
                min={1}
                required
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : 'Publish material'}
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => setShowAddForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="grid-2">
        <section className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h2 style={{ margin: 0 }}>Course Curriculum & Lessons ({materials.length})</h2>
            <span className="badge">Synced to Mobile App</span>
          </div>

          {materials.length === 0 ? (
            <Empty label="No materials added yet. Click '+ Add lesson content' to publish videos or audio." />
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: '0.85rem' }}>
              {materials.map((m) => (
                <li
                  key={m.id}
                  style={{
                    padding: '0.85rem',
                    background: 'var(--panel-2, rgba(255, 255, 255, 0.04))',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                    <strong>{m.title}</strong>
                    <span className="badge">{getMaterialIcon(m.type)}</span>
                  </div>
                  <div style={{ color: 'var(--muted)', margin: '0.35rem 0 0.5rem', fontSize: '0.9rem' }}>
                    {m.description}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {m.accessUrl ? (
                      <a href={m.accessUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--azure)', fontSize: '0.85rem' }}>
                        Preview SAS stream
                      </a>
                    ) : <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Protected asset</span>}

                    {canManage && (
                      <button
                        type="button"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#e63946',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                        }}
                        onClick={() => void handleDeleteMaterial(m.id)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <h2 style={{ marginBottom: '0.75rem' }}>Assessments & Quizzes</h2>
          {assessments.length === 0 ? (
            <Empty label="No assessments for this course." />
          ) : (
            assessments.map((a) => (
              <div key={a.id} style={{ marginBottom: '0.85rem', padding: '0.75rem', background: 'var(--panel-2, rgba(255, 255, 255, 0.03))', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>{a.title}</strong>
                  <span className="badge">{a.timeLimitMinutes} mins</span>
                </div>
                <div style={{ color: 'var(--muted)', margin: '0.25rem 0 0.5rem', fontSize: '0.9rem' }}>{a.description}</div>
                <Link className="btn btn-azure" style={{ marginTop: '0.25rem' }} to={`/app/assessments/${a.id}`}>
                  Inspect test
                </Link>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
