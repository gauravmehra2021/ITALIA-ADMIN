import { useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Link, useParams } from 'react-router-dom';
import { Empty, ErrorBox, Loading, SuccessBox } from '../components/StateBlock';
import { S3Uploader } from '../components/S3Uploader';
import { assignmentsApi, coursesApi, materialsApi } from '../services/platformApi';
import { DEFAULT_ADMIN_COURSES } from './CoursesPage';
import {
  type Assignment,
  type AssignmentSubmission,
  type Course,
  type Material,
} from '../types';

export function CourseDetailPage() {
  const { id } = useParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Active Tab: Curriculum | Assignments & Grading | Preview
  const [activeTab, setActiveTab] = useState<'curriculum' | 'assignments' | 'settings'>('curriculum');

  // Hierarchy Structure Builder
  const [moduleTitle, setModuleTitle] = useState('Modulo 1: Primi Passi in Italia');
  const [moduleNumber] = useState<number>(1);
  const [chapterTitle, setChapterTitle] = useState('Capitolo 1: I Saluti & Presentazioni');
  const [chapterNumber] = useState<number>(1);

  // New Lesson State
  const [showAddLesson, setShowAddLesson] = useState(false);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDesc, setLessonDesc] = useState('');
  const [lessonType, setLessonType] = useState<number>(1); // 1=Video, 2=Audio, 0=PDF, 3=Worksheet
  const [durationMinutes] = useState<number>(15);
  const [isFreePreview, setIsFreePreview] = useState(false);
  const [lessonSortOrder] = useState<number>(1);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoObjectKey, setVideoObjectKey] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfObjectKey, setPdfObjectKey] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [audioObjectKey, setAudioObjectKey] = useState('');
  const [contentText, setContentText] = useState('');
  const [practicalTask, setPracticalTask] = useState('');
  const [savingLesson, setSavingLesson] = useState(false);

  // Assignment Modal & Grading State
  const [showAddAssignment, setShowAddAssignment] = useState(false);
  const [assignTitle, setAssignTitle] = useState('');
  const [assignDesc, setAssignDesc] = useState('');
  const [assignTotalMarks, setAssignTotalMarks] = useState<number>(100);
  const [assignRefFile, setAssignRefFile] = useState('');
  const [submittingAssign, setSubmittingAssign] = useState(false);

  const [selectedAssignmentSubs, setSelectedAssignmentSubs] = useState<{
    assignment: Assignment;
    submissions: AssignmentSubmission[];
  } | null>(null);

  const [gradingSub, setGradingSub] = useState<AssignmentSubmission | null>(null);
  const [gradeMarks, setGradeMarks] = useState<number>(90);
  const [gradeFeedback, setGradeFeedback] = useState('Ottimo lavoro! Good grammar usage.');
  const [submittingGrade, setSubmittingGrade] = useState(false);

  async function loadData() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [cRes, mRes, aRes] = await Promise.allSettled([
        coursesApi.get(id),
        materialsApi.byCourse(id),
        assignmentsApi.byCourse(id),
      ]);

      if (cRes.status === 'fulfilled' && cRes.value) {
        setCourse(cRes.value);
      } else {
        const found = DEFAULT_ADMIN_COURSES.find((c) => c.id === id);
        if (found) setCourse(found);
      }

      if (mRes.status === 'fulfilled' && mRes.value && mRes.value.length > 0) {
        setMaterials(mRes.value);
      } else {
        setMaterials([
          {
            id: 'mat-1',
            courseId: id,
            title: 'Lezione 1: I Saluti e Le Presentazioni in Italiano',
            description: 'Introduction to essential everyday greetings: Ciao, Buongiorno, Buonasera, Come ti chiami?',
            type: 1, // Video
            isProtected: false,
            sortOrder: 1,
            chapterTitle: 'Modulo 1: Primi Passi in Italia',
            chapterNumber: 1,
            durationMinutes: 18,
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          },
          {
            id: 'mat-2',
            courseId: id,
            title: 'Dispensa PDF: Tavola dei Pronomi e Verbi Ausiliari',
            description: 'Printable study worksheet covering Essere and Avere in present tense.',
            type: 0, // PDF
            isProtected: false,
            sortOrder: 2,
            chapterTitle: 'Modulo 1: Primi Passi in Italia',
            chapterNumber: 1,
            durationMinutes: 10,
          },
        ]);
      }

      if (aRes.status === 'fulfilled' && aRes.value) {
        setAssignments(aRes.value);
      }
    } catch (e) {
      console.warn('Using seeded curriculum details', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [id]);

  const handleTogglePublish = async () => {
    if (!course) return;
    setError(null);
    setMessage(null);
    try {
      const isPublished = course.status === 1 || course.status === 'Published';
      if (isPublished) {
        await coursesApi.unpublish(course.id);
        setMessage(`Course "${course.title}" moved to Draft. It is now hidden from students.`);
      } else {
        await coursesApi.publish(course.id);
        setMessage(`Course "${course.title}" published! Live on Student Portal.`);
      }
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish status update failed');
    }
  };

  const handleCreateLesson = async (e: FormEvent) => {
    e.preventDefault();
    if (!id || !lessonTitle.trim()) return;
    setSavingLesson(true);
    setError(null);
    setMessage(null);

    try {
      await materialsApi.create({
        courseId: id,
        title: lessonTitle.trim(),
        description: lessonDesc.trim(),
        type: Number(lessonType),
        sortOrder: Number(lessonSortOrder),
        moduleTitle: moduleTitle.trim(),
        moduleNumber: Number(moduleNumber),
        chapterTitle: chapterTitle.trim(),
        chapterNumber: Number(chapterNumber),
        durationMinutes: Number(durationMinutes),
        isFreePreview,
        videoUrl: videoUrl.trim() || null,
        audioUrl: audioUrl.trim() || null,
        pdfUrl: pdfUrl.trim() || null,
        contentText: contentText.trim() || null,
        practicalTask: practicalTask.trim() || null,
      });

      setMessage(`✓ Lesson "${lessonTitle}" created and saved to curriculum.`);
      setLessonTitle('');
      setLessonDesc('');
      setVideoUrl('');
      setVideoObjectKey('');
      setPdfUrl('');
      setPdfObjectKey('');
      setAudioUrl('');
      setAudioObjectKey('');
      setContentText('');
      setPracticalTask('');
      setShowAddLesson(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add lesson');
    } finally {
      setSavingLesson(false);
    }
  };

  const handleDeleteLesson = async (matId: string) => {
    if (!confirm('Are you sure you want to delete this lesson?')) return;
    setError(null);
    setMessage(null);
    try {
      await materialsApi.delete(matId);
      setMessage('Lesson deleted.');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete lesson');
    }
  };

  const handleCreateAssignment = async (e: FormEvent) => {
    e.preventDefault();
    if (!id || !assignTitle.trim()) return;
    setSubmittingAssign(true);
    setError(null);
    setMessage(null);

    try {
      await assignmentsApi.create({
        courseId: id,
        chapterTitle: chapterTitle.trim(),
        title: assignTitle.trim(),
        description: assignDesc.trim(),
        referenceFileUrl: assignRefFile.trim() || undefined,
        totalMarks: Number(assignTotalMarks),
      });

      setMessage('Practical assignment created.');
      setAssignTitle('');
      setAssignDesc('');
      setAssignRefFile('');
      setShowAddAssignment(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create assignment');
    } finally {
      setSubmittingAssign(false);
    }
  };

  const handleOpenSubmissions = async (a: Assignment) => {
    setError(null);
    try {
      const subs = await assignmentsApi.submissions(a.id);
      setSelectedAssignmentSubs({ assignment: a, submissions: subs });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load submissions');
    }
  };

  const handleSaveGrade = async (e: FormEvent) => {
    e.preventDefault();
    if (!gradingSub) return;
    setSubmittingGrade(true);
    setError(null);
    setMessage(null);

    try {
      await assignmentsApi.grade(gradingSub.id, {
        marksObtained: Number(gradeMarks),
        teacherFeedback: gradeFeedback.trim(),
      });
      setMessage('Grade and feedback saved and dispatched to student.');
      setGradingSub(null);
      if (selectedAssignmentSubs) {
        await handleOpenSubmissions(selectedAssignmentSubs.assignment);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Grading failed');
    } finally {
      setSubmittingGrade(false);
    }
  };

  if (loading) return <Loading label="Loading course curriculum & content hierarchy…" />;
  if (!course) return <ErrorBox message="Course not found" />;

  const isPublished = course.status === 1 || course.status === 'Published';

  // Group materials into Modules -> Chapters -> Lessons
  const moduleMap: Record<string, Record<string, Material[]>> = {};

  materials.forEach((mat) => {
    const modKey = mat.chapterTitle?.includes('Modulo') ? mat.chapterTitle.split(':')[0] : 'Modulo 1';
    const chapKey = mat.chapterTitle || 'Capitolo 1';

    if (!moduleMap[modKey]) moduleMap[modKey] = {};
    if (!moduleMap[modKey][chapKey]) moduleMap[modKey][chapKey] = [];
    moduleMap[modKey][chapKey].push(mat);
  });

  return (
    <div className="animate-rise" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Breadcrumb & Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link to="/app/courses" style={{ color: 'var(--muted)', fontWeight: 600 }}>
            ← Back to Courses
          </Link>
          <span style={{ color: 'var(--border)' }}>/</span>
          <span style={{ fontWeight: 800, color: 'var(--text)', fontSize: '1.1rem' }}>
            {course.title}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span
            className="badge"
            style={{
              background: isPublished ? '#dcfce7' : '#fef3c7',
              color: isPublished ? '#15803d' : '#b45309',
              fontWeight: 700,
              padding: '6px 12px',
            }}
          >
            {isPublished ? '🟢 Published (Live for Students)' : '🟡 Draft (Hidden from Students)'}
          </span>

          <button
            type="button"
            onClick={handleTogglePublish}
            className={isPublished ? 'btn btn-secondary' : 'btn btn-primary'}
            style={{ fontSize: '0.85rem' }}
          >
            {isPublished ? '📥 Move to Draft' : '🚀 Publish Course Live'}
          </button>
        </div>
      </div>

      {error && <ErrorBox message={error} />}
      {message && <SuccessBox message={message} />}

      {/* Tabs Header */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
        <button
          onClick={() => setActiveTab('curriculum')}
          className={activeTab === 'curriculum' ? 'btn btn-primary' : 'btn btn-secondary'}
          style={{ padding: '8px 18px', fontSize: '0.9rem' }}
        >
          📚 Course Hierarchy & Content ({materials.length} Lessons)
        </button>
        <button
          onClick={() => setActiveTab('assignments')}
          className={activeTab === 'assignments' ? 'btn btn-primary' : 'btn btn-secondary'}
          style={{ padding: '8px 18px', fontSize: '0.9rem' }}
        >
          ✍️ Practical Assignments ({assignments.length})
        </button>
      </div>

      {/* TAB 1: CURRICULUM HIERARCHY BUILDER */}
      {activeTab === 'curriculum' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Top Bar with Add Lesson CTA */}
          <div className="panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                Course Content Tree
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: '4px 0 0' }}>
                Course → Modules → Chapters → Lessons → Activities. Upload videos and PDFs directly to AWS S3.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowAddLesson(!showAddLesson)}
            >
              {showAddLesson ? '✕ Close Lesson Builder' : '➕ Add Lesson to Curriculum'}
            </button>
          </div>

          {/* Add Lesson Form Panel */}
          {showAddLesson && (
            <div className="panel" style={{ borderLeft: '4px solid #0284c7', background: 'var(--sand)' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--azure)' }}>
                Create Lesson & Upload Media to AWS S3
              </h3>

              <form onSubmit={handleCreateLesson} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="field">
                    <label>Module Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Modulo 1: Primi Passi in Italia"
                      value={moduleTitle}
                      onChange={(e) => setModuleTitle(e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label>Chapter Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Capitolo 1: I Saluti & Presentazioni"
                      value={chapterTitle}
                      onChange={(e) => setChapterTitle(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                  <div className="field">
                    <label>Lesson Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Lezione 1: Come presentarsi in italiano"
                      value={lessonTitle}
                      onChange={(e) => setLessonTitle(e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label>Content Type *</label>
                    <select value={lessonType} onChange={(e) => setLessonType(Number(e.target.value))}>
                      <option value={1}>🎬 Video Lesson</option>
                      <option value={2}>🎧 Audio Pronunciation Lab</option>
                      <option value={0}>📄 PDF Worksheet / Notes</option>
                      <option value={3}>📝 Interactive Activity / Task</option>
                    </select>
                  </div>
                </div>

                <div className="field">
                  <label>Lesson Description / Summary</label>
                  <input
                    type="text"
                    placeholder="Short summary of what students will learn in this lesson"
                    value={lessonDesc}
                    onChange={(e) => setLessonDesc(e.target.value)}
                  />
                </div>

                {/* S3 Media Uploaders based on content type */}
                {lessonType === 1 && (
                  <div style={{ background: 'var(--card-bg)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--card-border)' }}>
                    <S3Uploader
                      courseId={course.id}
                      category="videos"
                      label="Video Lesson (MP4 / WebM Direct to AWS S3)"
                      acceptedTypes="video/mp4,video/webm,video/quicktime"
                      maxSizeMb={500}
                      currentUrl={videoUrl}
                      currentObjectKey={videoObjectKey}
                      onUploadSuccess={(res) => {
                        setVideoUrl(res.accessUrl);
                        setVideoObjectKey(res.objectKey);
                      }}
                      onRemove={() => {
                        setVideoUrl('');
                        setVideoObjectKey('');
                      }}
                    />
                  </div>
                )}

                {lessonType === 0 && (
                  <div style={{ background: 'var(--card-bg)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--card-border)' }}>
                    <S3Uploader
                      courseId={course.id}
                      category="documents"
                      label="PDF Worksheet or Study Notes (Direct to AWS S3)"
                      acceptedTypes="application/pdf"
                      maxSizeMb={50}
                      currentUrl={pdfUrl}
                      currentObjectKey={pdfObjectKey}
                      onUploadSuccess={(res) => {
                        setPdfUrl(res.accessUrl);
                        setPdfObjectKey(res.objectKey);
                      }}
                      onRemove={() => {
                        setPdfUrl('');
                        setPdfObjectKey('');
                      }}
                    />
                  </div>
                )}

                {lessonType === 2 && (
                  <div style={{ background: 'var(--card-bg)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--card-border)' }}>
                    <S3Uploader
                      courseId={course.id}
                      category="audios"
                      label="Native Italian Audio Recording (MP3 / WAV Direct to AWS S3)"
                      acceptedTypes="audio/mpeg,audio/mp3,audio/wav"
                      maxSizeMb={50}
                      currentUrl={audioUrl}
                      currentObjectKey={audioObjectKey}
                      onUploadSuccess={(res) => {
                        setAudioUrl(res.accessUrl);
                        setAudioObjectKey(res.objectKey);
                      }}
                      onRemove={() => {
                        setAudioUrl('');
                        setAudioObjectKey('');
                      }}
                    />
                  </div>
                )}

                <div className="field">
                  <label>Study Notes & Grammar Points (Markdown / Plain Text)</label>
                  <textarea
                    rows={4}
                    placeholder="Write key vocabulary, verb conjugation tables, and phrases for students..."
                    value={contentText}
                    onChange={(e) => setContentText(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label>Practical Exercise / Homework Task</label>
                  <input
                    type="text"
                    placeholder="e.g. Record 30 seconds introducing yourself and submit in Student Portal"
                    value={practicalTask}
                    onChange={(e) => setPracticalTask(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      id="freePreview"
                      checked={isFreePreview}
                      onChange={(e) => setIsFreePreview(e.target.checked)}
                    />
                    <label htmlFor="freePreview" style={{ fontSize: '0.88rem', fontWeight: 600 }}>
                      Allow Free Preview (Accessible before registration)
                    </label>
                  </div>

                  <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowAddLesson(false)}
                      disabled={savingLesson}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={savingLesson}
                    >
                      {savingLesson ? 'Saving…' : '✓ Add Lesson to Curriculum'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Curriculum Tree View */}
          {materials.length === 0 ? (
            <Empty
              label="No lessons in this course curriculum yet."
              action={
                <button className="btn btn-primary" onClick={() => setShowAddLesson(true)}>
                  ➕ Create First Lesson
                </button>
              }
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {Object.entries(moduleMap).map(([modName, chapObj]) => (
                <div key={modName} className="panel" style={{ padding: '1.25rem', borderLeft: '4px solid #0D5C75' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '1.4rem' }}>📁</span>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                        {modName}
                      </h3>
                    </div>
                  </div>

                  {Object.entries(chapObj).map(([chapName, items]) => (
                    <div
                      key={chapName}
                      style={{
                        background: 'var(--sand)',
                        borderRadius: '10px',
                        padding: '1rem',
                        marginBottom: '1rem',
                        border: '1px solid var(--card-border)',
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--ink)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>📖</span>
                        <span>{chapName}</span>
                        <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>
                          {items.length} Activities
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {items.map((item, idx) => {
                          const icon = item.type === 1 ? '🎬' : item.type === 2 ? '🎧' : '📄';
                          const typeLabel = item.type === 1 ? 'Video' : item.type === 2 ? 'Audio Lab' : 'Document';

                          return (
                            <div
                              key={item.id}
                              style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--card-border)',
                                borderRadius: '8px',
                                padding: '10px 14px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '12px',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                                <span style={{ fontSize: '1.2rem' }}>{icon}</span>
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>
                                    {idx + 1}. {item.title}
                                  </div>
                                  <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                                    {typeLabel} • {item.durationMinutes || 15} mins {item.videoUrl && '• AWS S3 Stream Ready'}
                                  </div>
                                </div>
                              </div>

                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                {item.videoUrl && (
                                  <a
                                    href={item.videoUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn btn-secondary"
                                    style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                                  >
                                    ▶ Preview
                                  </a>
                                )}
                                {item.pdfUrl && (
                                  <a
                                    href={item.pdfUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn btn-secondary"
                                    style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                                  >
                                    📄 PDF
                                  </a>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteLesson(item.id)}
                                  className="btn btn-secondary"
                                  style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#dc2626' }}
                                  title="Delete Lesson"
                                >
                                  🗑
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PRACTICAL ASSIGNMENTS & GRADING */}
      {activeTab === 'assignments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                Practical Assignments & Homework
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: '4px 0 0' }}>
                Review student text and audio homework submissions and assign grades and feedback.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowAddAssignment(!showAddAssignment)}
            >
              {showAddAssignment ? '✕ Close Form' : '➕ Create New Assignment'}
            </button>
          </div>

          {showAddAssignment && (
            <div className="panel" style={{ background: 'var(--sand)', borderLeft: '4px solid #f59e0b' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--ink)' }}>
                New Homework Assignment
              </h3>
              <form onSubmit={handleCreateAssignment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="field">
                  <label>Assignment Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Modulo 1: Presentazione Personale in Italiano"
                    value={assignTitle}
                    onChange={(e) => setAssignTitle(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label>Task Instructions for Students *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Describe what the student needs to write or record..."
                    value={assignDesc}
                    onChange={(e) => setAssignDesc(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="field">
                    <label>Total Marks</label>
                    <input
                      type="number"
                      value={assignTotalMarks}
                      onChange={(e) => setAssignTotalMarks(Number(e.target.value))}
                    />
                  </div>

                  <div className="field">
                    <label>Reference Attachment (optional)</label>
                    <input
                      type="text"
                      placeholder="Optional link to reference document"
                      value={assignRefFile}
                      onChange={(e) => setAssignRefFile(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowAddAssignment(false)}
                    disabled={submittingAssign}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submittingAssign}
                  >
                    {submittingAssign ? 'Creating…' : 'Save Assignment'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Assignments List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {assignments.map((a) => (
              <div
                key={a.id}
                className="panel"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text)', margin: '0 0 4px' }}>
                    {a.title}
                  </h4>
                  <p style={{ color: 'var(--muted)', fontSize: '0.88rem', margin: '0 0 6px' }}>
                    {a.description}
                  </p>
                  <span className="badge badge-primary">Total Marks: {a.totalMarks}</span>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => handleOpenSubmissions(a)}
                    className="btn btn-primary"
                    style={{ fontSize: '0.85rem' }}
                  >
                    📝 Review Student Submissions
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Submissions Review Modal */}
          {selectedAssignmentSubs &&
            createPortal(
              <div
                onClick={(e) => {
                  if (e.target === e.currentTarget) setSelectedAssignmentSubs(null);
                }}
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(9, 39, 71, 0.7)',
                  backdropFilter: 'blur(6px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 99999,
                  padding: '1.5rem',
                }}
              >
                <div
                  className="panel"
                  style={{
                    width: '100%',
                    maxWidth: '700px',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    background: 'var(--card-bg)',
                    padding: '2rem',
                    borderRadius: '20px',
                    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.45)',
                    border: '1px solid var(--card-border)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
                      Submissions: {selectedAssignmentSubs.assignment.title}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setSelectedAssignmentSubs(null)}
                      style={{ background: 'transparent', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: 'var(--muted)' }}
                    >
                      ✕
                    </button>
                  </div>

                  {selectedAssignmentSubs.submissions.length === 0 ? (
                    <p style={{ color: 'var(--muted)', padding: '1rem 0' }}>No submissions received from students yet.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {selectedAssignmentSubs.submissions.map((sub) => (
                        <div
                          key={sub.id}
                          style={{
                            border: '1px solid var(--line)',
                            borderRadius: '12px',
                            padding: '1rem',
                            background: 'var(--sand)',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{sub.studentName} ({sub.studentEmail})</span>
                            <span className="badge badge-success">
                              {sub.marksObtained !== null && sub.marksObtained !== undefined
                                ? `Score: ${sub.marksObtained}/100`
                                : 'Pending Grade'}
                            </span>
                          </div>
                          <p style={{ background: 'var(--card-bg)', border: '1px solid var(--line)', padding: '10px', borderRadius: '8px', fontSize: '0.88rem', color: 'var(--ink)' }}>
                            {sub.submissionText}
                          </p>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setGradingSub(sub)}
                            style={{ marginTop: '8px', fontSize: '0.8rem', padding: '6px 12px' }}
                          >
                            Grade Submission
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>,
              document.body
            )}

          {/* Grade Form Modal */}
          {gradingSub &&
            createPortal(
              <div
                onClick={(e) => {
                  if (e.target === e.currentTarget) setGradingSub(null);
                }}
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(9, 39, 71, 0.75)',
                  backdropFilter: 'blur(6px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 100000,
                  padding: '1.5rem',
                }}
              >
                <div
                  className="panel"
                  style={{
                    width: '100%',
                    maxWidth: '520px',
                    background: 'var(--card-bg)',
                    padding: '2rem',
                    borderRadius: '20px',
                    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.45)',
                    border: '1px solid var(--card-border)',
                  }}
                >
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--ink)' }}>
                    Grade Submission for {gradingSub.studentName}
                  </h3>
                  <form onSubmit={handleSaveGrade} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="field">
                      <label>Marks Obtained (out of 100) *</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        required
                        value={gradeMarks}
                        onChange={(e) => setGradeMarks(Number(e.target.value))}
                      />
                    </div>

                    <div className="field">
                      <label>Instructor Feedback *</label>
                      <textarea
                        rows={3}
                        required
                        value={gradeFeedback}
                        onChange={(e) => setGradeFeedback(e.target.value)}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '0.5rem' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setGradingSub(null)}
                        disabled={submittingGrade}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={submittingGrade}
                      >
                        {submittingGrade ? 'Saving…' : '✓ Send Grade & Feedback'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>,
              document.body
            )}
        </div>
      )}
    </div>
  );
}
export default CourseDetailPage;
