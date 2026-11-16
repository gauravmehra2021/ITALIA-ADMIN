import type { FormEvent, ChangeEvent } from 'react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Empty, ErrorBox, Loading, SuccessBox } from '../components/StateBlock';
import { useAuth } from '../hooks/useAuth';
import { assignmentsApi, coursesApi, materialsApi, mediaApi } from '../services/platformApi';
import {
  levelLabel,
  statusLabel,
  type Assignment,
  type AssignmentSubmission,
  type Course,
  type Material,
} from '../types';

export function CourseDetailPage() {
  const { id } = useParams();
  const { hasRole } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignmentSubs, setSelectedAssignmentSubs] = useState<{
    assignment: Assignment;
    submissions: AssignmentSubmission[];
  } | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Lesson Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [chapterTitle, setChapterTitle] = useState('Chapter 1: Foundations');
  const [chapterNumber, setChapterNumber] = useState<number>(1);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newType, setNewType] = useState<number>(1); // 1 = Video, 2 = Audio, 0 = PDF, 3 = Worksheet
  const [newSortOrder, setNewSortOrder] = useState<number>(1);
  const [durationMinutes, setDurationMinutes] = useState<number>(15);
  const [videoUrl, setVideoUrl] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [contentText, setContentText] = useState('');
  const [practicalTask, setPracticalTask] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgressMsg, setUploadProgressMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Assignment Form State
  const [showAddAssignment, setShowAddAssignment] = useState(false);
  const [assignChapter, setAssignChapter] = useState('Chapter 1: Practical Assignments');
  const [assignTitle, setAssignTitle] = useState('');
  const [assignDesc, setAssignDesc] = useState('');
  const [assignRefFile, setAssignRefFile] = useState('');
  const [assignDueDate, setAssignDueDate] = useState('');
  const [assignTotalMarks, setAssignTotalMarks] = useState<number>(100);
  const [submittingAssign, setSubmittingAssign] = useState(false);

  // Grading Modal State
  const [gradingSub, setGradingSub] = useState<AssignmentSubmission | null>(null);
  const [gradeMarks, setGradeMarks] = useState<number>(85);
  const [gradeFeedback, setGradeFeedback] = useState('Excellent work. Keep practicing!');
  const [submittingGrade, setSubmittingGrade] = useState(false);

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
      try {
        setAssignments(await assignmentsApi.byCourse(id));
      } catch {
        setAssignments([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load course');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [id]);

  async function handleFileUpload(e: ChangeEvent<HTMLInputElement>, targetField: 'video' | 'audio' | 'pdf' | 'ref') {
    const file = e.target.files?.[0];
    if (!file) return;

    const category = targetField === 'video' ? 'videos' : targetField === 'audio' ? 'audios' : 'documents';
    setUploadingFile(true);
    setUploadProgressMsg(`Uploading ${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB)…`);
    setError(null);

    try {
      const res = await mediaApi.upload(file, category);
      if (targetField === 'video') setVideoUrl(res.url);
      else if (targetField === 'audio') setAudioUrl(res.url);
      else if (targetField === 'pdf') setPdfUrl(res.url);
      else if (targetField === 'ref') setAssignRefFile(res.url);

      setUploadProgressMsg(`✓ ${file.name} uploaded successfully!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Media upload failed');
      setUploadProgressMsg(null);
    } finally {
      setUploadingFile(false);
    }
  }

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
        chapterTitle: chapterTitle.trim(),
        chapterNumber: Number(chapterNumber),
        durationMinutes: Number(durationMinutes),
        videoUrl: videoUrl.trim() || null,
        audioUrl: audioUrl.trim() || null,
        pdfUrl: pdfUrl.trim() || null,
        contentText: contentText.trim() || null,
        practicalTask: practicalTask.trim() || null,
      });

      setMessage('New lesson content added successfully! Synced across Admin & Mobile App.');
      setNewTitle('');
      setNewDescription('');
      setVideoUrl('');
      setAudioUrl('');
      setPdfUrl('');
      setContentText('');
      setPracticalTask('');
      setShowAddForm(false);
      setUploadProgressMsg(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add content');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteMaterial(matId: string) {
    if (!confirm('Are you sure you want to remove this lesson content?')) return;
    setError(null);
    setMessage(null);
    try {
      await materialsApi.delete(matId);
      setMessage('Lesson content removed.');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete material');
    }
  }

  async function handleCreateAssignment(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSubmittingAssign(true);
    setError(null);
    setMessage(null);
    try {
      await assignmentsApi.create({
        courseId: id,
        chapterTitle: assignChapter.trim(),
        title: assignTitle.trim(),
        description: assignDesc.trim(),
        referenceFileUrl: assignRefFile.trim() || undefined,
        dueDateUtc: assignDueDate ? new Date(assignDueDate).toISOString() : undefined,
        totalMarks: Number(assignTotalMarks),
      });

      setMessage('Practical Assignment created and assigned to students!');
      setShowAddAssignment(false);
      setAssignTitle('');
      setAssignDesc('');
      setAssignRefFile('');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create assignment');
    } finally {
      setSubmittingAssign(false);
    }
  }

  async function handleOpenSubmissions(assign: Assignment) {
    setError(null);
    try {
      const subs = await assignmentsApi.submissions(assign.id);
      setSelectedAssignmentSubs({ assignment: assign, submissions: subs });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assignment submissions');
    }
  }

  async function handleGradeSubmission(e: FormEvent) {
    e.preventDefault();
    if (!gradingSub) return;
    setSubmittingGrade(true);
    setError(null);
    try {
      await assignmentsApi.grade(gradingSub.id, {
        marksObtained: Number(gradeMarks),
        teacherFeedback: gradeFeedback,
      });

      setMessage(`Submission graded (${gradeMarks}/100). Student notified via email.`);
      setGradingSub(null);
      if (selectedAssignmentSubs) {
        const updatedSubs = await assignmentsApi.submissions(selectedAssignmentSubs.assignment.id);
        setSelectedAssignmentSubs({ ...selectedAssignmentSubs, submissions: updatedSubs });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to grade submission');
    } finally {
      setSubmittingGrade(false);
    }
  }

  const canManage = hasRole('Mentor') || hasRole('Admin') || hasRole('SuperAdmin');

  if (loading) return <Loading />;
  if (error && !course) return <ErrorBox message={error} />;
  if (!course) return <Empty label="Course not found." />;

  const getMaterialIcon = (type: string | number) => {
    const t = Number(type);
    switch (t) {
      case 1: return '🎬 Video Lecture';
      case 2: return '🎧 Audio Guide';
      case 0: return '📄 PDF Document';
      case 3: return '📝 Practical Task';
      default: return '📁 Resource';
    }
  };

  // Group materials by Chapter
  const groupedMaterials = materials.reduce((acc, m) => {
    const chName = m.chapterTitle || `Chapter ${m.chapterNumber || 1}`;
    if (!acc[chName]) acc[chName] = [];
    acc[chName].push(m);
    return acc;
  }, {} as Record<string, Material[]>);

  return (
    <div className="animate-rise">
      <div className="page-header">
        <div>
          <h1>{course.title}</h1>
          <p>{course.description}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {canManage && (
            <>
              <button className="btn btn-primary" type="button" onClick={() => setShowAddForm((v) => !v)}>
                {showAddForm ? 'Close Lesson Form' : '+ Add Chapter Lesson'}
              </button>
              <button className="btn btn-azure" type="button" onClick={() => setShowAddAssignment((v) => !v)}>
                {showAddAssignment ? 'Close Assignment Form' : '+ Add Practical Assignment'}
              </button>
            </>
          )}
          <Link className="btn btn-secondary" to="/app/courses">Back to courses</Link>
        </div>
      </div>

      {message && <SuccessBox message={message} />}
      {error && <ErrorBox message={error} />}

      <div className="grid-4" style={{ marginBottom: '1.25rem' }}>
        <div className="stat"><span>Level</span><strong style={{ fontSize: '1.2rem' }}>{levelLabel(course.level)}</strong></div>
        <div className="stat"><span>Status</span><strong style={{ fontSize: '1.2rem' }}>{statusLabel(course.status)}</strong></div>
        <div className="stat"><span>Instructor</span><strong style={{ fontSize: '1.2rem' }}>{course.mentorName ?? 'Assigned Mentor'}</strong></div>
        <div className="stat"><span>Total Chapters</span><strong style={{ fontSize: '1.2rem' }}>{Object.keys(groupedMaterials).length || 1}</strong></div>
      </div>

      {/* CREATE LESSON FORM */}
      {showAddForm && canManage && (
        <form className="panel" onSubmit={handleAddMaterial} style={{ marginBottom: '1.25rem', border: '1px solid var(--azure)' }}>
          <h2>Add Lesson to Course (Modules / Chapters Flow)</h2>
          <p style={{ color: 'var(--muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
            Author chapter lessons with multimedia. Upload video tutorials, native audio recordings, PDF workbook notes, explanations, and practical tasks.
          </p>

          <div className="grid-2">
            <div className="field">
              <label>Module / Chapter Title</label>
              <input
                value={chapterTitle}
                onChange={(e) => setChapterTitle(e.target.value)}
                placeholder="e.g. Chapter 1: Introduction & Fundamentals"
                required
              />
            </div>
            <div className="field">
              <label>Chapter Sequence Number</label>
              <input
                type="number"
                value={chapterNumber}
                onChange={(e) => setChapterNumber(Number(e.target.value))}
                min={1}
                required
              />
            </div>
          </div>

          <div className="grid-4">
            <div className="field">
              <label>Lesson Title</label>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Italian Alphabet & Pronunciation Lab"
                required
              />
            </div>
            <div className="field">
              <label>Primary Content Type</label>
              <select value={newType} onChange={(e) => setNewType(Number(e.target.value))}>
                <option value={1}>🎬 Video Tutorial</option>
                <option value={2}>🎧 Audio Listening / Pronunciation</option>
                <option value={0}>📄 PDF / Notes Workbook</option>
                <option value={3}>📝 Interactive Practical Task</option>
              </select>
            </div>
            <div className="field">
              <label>Duration (Mins)</label>
              <input
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                min={1}
                required
              />
            </div>
            <div className="field">
              <label>Sort Order</label>
              <input
                type="number"
                value={newSortOrder}
                onChange={(e) => setNewSortOrder(Number(e.target.value))}
                min={1}
                required
              />
            </div>
          </div>

          <div className="field">
            <label>Description & Learning Objectives</label>
            <textarea
              rows={2}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Summary of this lesson for the student..."
              required
            />
          </div>

          {/* MEDIA UPLOAD SECTION */}
          <div style={{ background: 'var(--panel-2, rgba(255,255,255,0.03))', padding: '14px', borderRadius: '8px', marginBottom: '1rem', border: '1px solid var(--border)' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '1rem' }}>Media Files & Video/Audio Storage</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: '0 0 12px' }}>
              Upload media files directly to the server. Files are automatically configured for fast HTTP 206 byte-range streaming on Mobile App and Admin Portal.
            </p>

            <div className="grid-3">
              <div className="field">
                <label>Upload Video (.mp4, .webm, .mov)</label>
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  disabled={uploadingFile}
                  onChange={(e) => void handleFileUpload(e, 'video')}
                />
                {videoUrl && <div style={{ fontSize: '0.8rem', color: 'var(--azure)', marginTop: 4 }}>✓ Video Attached</div>}
              </div>

              <div className="field">
                <label>Upload Audio (.mp3, .wav, .m4a)</label>
                <input
                  type="file"
                  accept="audio/mp3,audio/wav,audio/m4a,audio/mpeg"
                  disabled={uploadingFile}
                  onChange={(e) => void handleFileUpload(e, 'audio')}
                />
                {audioUrl && <div style={{ fontSize: '0.8rem', color: 'var(--azure)', marginTop: 4 }}>✓ Audio Attached</div>}
              </div>

              <div className="field">
                <label>Upload PDF Notes / Workbook</label>
                <input
                  type="file"
                  accept="application/pdf"
                  disabled={uploadingFile}
                  onChange={(e) => void handleFileUpload(e, 'pdf')}
                />
                {pdfUrl && <div style={{ fontSize: '0.8rem', color: 'var(--azure)', marginTop: 4 }}>✓ PDF Attached</div>}
              </div>
            </div>

            {uploadProgressMsg && (
              <div style={{ fontSize: '0.85rem', color: 'var(--azure)', marginTop: '8px' }}>
                {uploadProgressMsg}
              </div>
            )}
          </div>

          <div className="grid-2">
            <div className="field">
              <label>Text Explanation / Comprehensive Notes</label>
              <textarea
                rows={3}
                value={contentText}
                onChange={(e) => setContentText(e.target.value)}
                placeholder="In-depth textual explanation, vocabulary tables, rules..."
              />
            </div>
            <div className="field">
              <label>Practical Task for Student</label>
              <textarea
                rows={3}
                value={practicalTask}
                onChange={(e) => setPracticalTask(e.target.value)}
                placeholder="Practical action item (e.g. Record 5 audio sentences, translate dialogue)..."
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button className="btn btn-primary" type="submit" disabled={submitting || uploadingFile}>
              {submitting ? 'Publishing Lesson…' : 'Publish Chapter Lesson'}
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => setShowAddForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* CREATE ASSIGNMENT FORM */}
      {showAddAssignment && canManage && (
        <form className="panel" onSubmit={handleCreateAssignment} style={{ marginBottom: '1.25rem', border: '1px solid #d4af37' }}>
          <h2>Add Practical Assignment for Students</h2>
          <p style={{ color: 'var(--muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
            Students will submit practical work via their mobile app, which mentors can review, grade, and provide personalized feedback on.
          </p>

          <div className="grid-2">
            <div className="field">
              <label>Associated Chapter</label>
              <input value={assignChapter} onChange={(e) => setAssignChapter(e.target.value)} required />
            </div>
            <div className="field">
              <label>Assignment Title</label>
              <input value={assignTitle} onChange={(e) => setAssignTitle(e.target.value)} placeholder="e.g. Essay on Italian Renaissance" required />
            </div>
          </div>

          <div className="field">
            <label>Assignment Description & Requirements</label>
            <textarea rows={3} value={assignDesc} onChange={(e) => setAssignDesc(e.target.value)} placeholder="Provide instructions, questions, word count..." required />
          </div>

          <div className="grid-3">
            <div className="field">
              <label>Reference PDF / Work File (Optional)</label>
              <input type="file" accept="application/pdf,application/zip" onChange={(e) => void handleFileUpload(e, 'ref')} />
              {assignRefFile && <div style={{ fontSize: '0.8rem', color: 'var(--azure)' }}>✓ Reference Attached</div>}
            </div>
            <div className="field">
              <label>Submission Deadline</label>
              <input type="datetime-local" value={assignDueDate} onChange={(e) => setAssignDueDate(e.target.value)} />
            </div>
            <div className="field">
              <label>Total Marks</label>
              <input type="number" value={assignTotalMarks} onChange={(e) => setAssignTotalMarks(Number(e.target.value))} min={10} max={100} required />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button className="btn btn-primary" type="submit" disabled={submittingAssign}>
              {submittingAssign ? 'Publishing…' : 'Publish Assignment'}
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => setShowAddAssignment(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* CURRICULUM CHAPTERS & LESSONS */}
      <section className="panel" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ margin: 0 }}>Course Chapters & Lessons ({materials.length})</h2>
            <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '0.85rem' }}>
              Full chapter-by-chapter progression. Videos, audio guides, and notes are playable directly below.
            </p>
          </div>
          <span className="badge">Fully Synced to Mobile App</span>
        </div>

        {materials.length === 0 ? (
          <Empty label="No chapter lessons added yet. Click '+ Add Chapter Lesson' above to publish video, audio, or notes." />
        ) : (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {Object.entries(groupedMaterials).map(([chTitle, lessons]) => (
              <div
                key={chTitle}
                style={{
                  background: 'var(--panel-2, rgba(255, 255, 255, 0.03))',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    padding: '12px 16px',
                    background: 'rgba(13, 92, 117, 0.15)',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <strong style={{ fontSize: '1.05rem', color: 'var(--text)' }}>📂 {chTitle}</strong>
                  <span className="badge">{lessons.length} Lesson{lessons.length > 1 ? 's' : ''}</span>
                </div>

                <div style={{ padding: '12px', display: 'grid', gap: '1rem' }}>
                  {lessons.map((m) => (
                    <article
                      key={m.id}
                      style={{
                        padding: '12px',
                        background: 'var(--panel, rgba(255, 255, 255, 0.02))',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                        <div>
                          <strong style={{ fontSize: '1rem' }}>{m.title}</strong>
                          <span style={{ marginLeft: 8, fontSize: '0.8rem', color: 'var(--muted)' }}>
                            ⏱️ {m.durationMinutes ?? 15} mins
                          </span>
                        </div>
                        <span className="badge">{getMaterialIcon(m.type)}</span>
                      </div>

                      {m.description && (
                        <p style={{ color: 'var(--muted)', margin: '0.4rem 0 0.6rem', fontSize: '0.9rem' }}>
                          {m.description}
                        </p>
                      )}

                      {/* INLINE MEDIA PREVIEW (Video / Audio / PDF) */}
                      {m.videoUrl && (
                        <div style={{ margin: '8px 0' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                            🎬 Video Tutorial Stream:
                          </span>
                          <video
                            controls
                            preload="metadata"
                            src={m.videoUrl}
                            style={{ width: '100%', maxHeight: '320px', borderRadius: '6px', background: '#000' }}
                          />
                        </div>
                      )}

                      {m.audioUrl && (
                        <div style={{ margin: '8px 0' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                            🎧 Native Audio Pronunciation:
                          </span>
                          <audio controls preload="metadata" src={m.audioUrl} style={{ width: '100%' }} />
                        </div>
                      )}

                      {m.pdfUrl && (
                        <div style={{ margin: '8px 0' }}>
                          <a
                            href={m.pdfUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-secondary"
                            style={{ fontSize: '0.85rem', display: 'inline-block' }}
                          >
                            📄 Open Lesson PDF Workbook
                          </a>
                        </div>
                      )}

                      {m.contentText && (
                        <div style={{ margin: '8px 0', background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '6px', fontSize: '0.88rem' }}>
                          <strong>📖 Explanation:</strong>
                          <p style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{m.contentText}</p>
                        </div>
                      )}

                      {m.practicalTask && (
                        <div style={{ margin: '8px 0', background: 'rgba(212, 175, 55, 0.1)', border: '1px solid rgba(212, 175, 55, 0.3)', padding: '10px', borderRadius: '6px', fontSize: '0.88rem' }}>
                          <strong style={{ color: '#d4af37' }}>✍️ Practical Task:</strong>
                          <p style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{m.practicalTask}</p>
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                        {canManage && (
                          <button
                            type="button"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#e63946',
                              cursor: 'pointer',
                              fontSize: '0.82rem',
                            }}
                            onClick={() => void handleDeleteMaterial(m.id)}
                          >
                            Remove Lesson
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ASSIGNMENTS SECTION */}
      <section className="panel" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div>
            <h2 style={{ margin: 0 }}>Practical Assignments ({assignments.length})</h2>
            <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '0.85rem' }}>
              Practical tasks with submission deadlines and mentor grading.
            </p>
          </div>
        </div>

        {assignments.length === 0 ? (
          <Empty label="No practical assignments created for this course yet." />
        ) : (
          <div style={{ display: 'grid', gap: '0.85rem' }}>
            {assignments.map((a) => (
              <div
                key={a.id}
                style={{
                  padding: '12px',
                  background: 'var(--panel-2, rgba(255,255,255,0.03))',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <strong>{a.title}</strong>
                    <span className="badge" style={{ fontSize: '0.75rem' }}>{a.chapterTitle}</span>
                    <span className="badge" style={{ fontSize: '0.75rem' }}>{a.totalMarks} Marks</span>
                  </div>
                  <div style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: 4 }}>{a.description}</div>
                  {a.dueDateUtc && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--azure)', marginTop: 4 }}>
                      Due: {new Date(a.dueDateUtc).toLocaleDateString()}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {a.referenceFileUrl && (
                    <a href={a.referenceFileUrl} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
                      Ref File
                    </a>
                  )}
                  {canManage && (
                    <button
                      className="btn btn-azure"
                      type="button"
                      style={{ fontSize: '0.8rem' }}
                      onClick={() => void handleOpenSubmissions(a)}
                    >
                      View Submissions & Grade
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SUBMISSIONS MODAL */}
      {selectedAssignmentSubs && (
        <section className="panel" style={{ marginBottom: '1.25rem', border: '1px solid var(--azure)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h2 style={{ margin: 0 }}>
              Submissions: {selectedAssignmentSubs.assignment.title} ({selectedAssignmentSubs.submissions.length})
            </h2>
            <button className="btn btn-secondary" type="button" onClick={() => setSelectedAssignmentSubs(null)}>
              Close Submissions
            </button>
          </div>

          {selectedAssignmentSubs.submissions.length === 0 ? (
            <Empty label="No student submissions received for this assignment yet." />
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Submission Date</th>
                  <th>Status</th>
                  <th>Marks</th>
                  <th>Feedback</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {selectedAssignmentSubs.submissions.map((sub) => (
                  <tr key={sub.id}>
                    <td>
                      <strong>{sub.studentName}</strong>
                      <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{sub.studentEmail}</div>
                      {sub.submissionText && (
                        <div style={{ fontSize: '0.82rem', marginTop: 4, background: 'rgba(0,0,0,0.2)', padding: 6, borderRadius: 4 }}>
                          "{sub.submissionText}"
                        </div>
                      )}
                      {sub.submissionFileUrl && (
                        <a href={sub.submissionFileUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: 'var(--azure)', display: 'block', marginTop: 4 }}>
                          📎 View Submitted File
                        </a>
                      )}
                    </td>
                    <td>{new Date(sub.submittedAtUtc).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge ${sub.status === 'Graded' ? 'badge-success' : 'badge-warn'}`}>
                        {sub.status}
                      </span>
                    </td>
                    <td>
                      {sub.marksObtained !== null && sub.marksObtained !== undefined
                        ? `${sub.marksObtained} / ${selectedAssignmentSubs.assignment.totalMarks}`
                        : 'Ungraded'}
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                      {sub.teacherFeedback ?? '—'}
                    </td>
                    <td>
                      <button
                        className="btn btn-primary"
                        type="button"
                        style={{ fontSize: '0.78rem', padding: '4px 8px' }}
                        onClick={() => {
                          setGradingSub(sub);
                          setGradeMarks(sub.marksObtained ?? 85);
                          setGradeFeedback(sub.teacherFeedback ?? 'Well structured response!');
                        }}
                      >
                        Grade & Feedback
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {/* GRADING FORM */}
      {gradingSub && (
        <form className="panel" onSubmit={handleGradeSubmission} style={{ marginBottom: '1.25rem', border: '1px solid #10b981' }}>
          <h2>Grade Submission – {gradingSub.studentName}</h2>
          <div className="grid-2">
            <div className="field">
              <label>Marks Awarded (out of 100)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={gradeMarks}
                onChange={(e) => setGradeMarks(Number(e.target.value))}
                required
              />
            </div>
            <div className="field">
              <label>Mentor Feedback Note</label>
              <textarea
                rows={2}
                value={gradeFeedback}
                onChange={(e) => setGradeFeedback(e.target.value)}
                placeholder="Give constructive feedback on grammar, pronunciation, vocabulary..."
                required
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-primary" type="submit" disabled={submittingGrade}>
              {submittingGrade ? 'Submitting Grade…' : 'Submit Grade & Email Student'}
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => setGradingSub(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
