import { Icon } from '../components/Icons';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { coursesApi, curriculumApi } from '../services/platformApi';
import { mediaUrl, openDocument } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { KIND_META, MediaField, Modal, StatusBadge } from '../components/builder/BuilderKit';
import { CourseForm } from '../components/builder/CourseForm';
import { lessonTemplate } from '../components/builder/templates';
import type { CourseModule, CourseOutline, CourseUnit, LessonKind, SaveModuleRequest, SaveUnitRequest, StudentCourseProgress } from '../types';
import '../components/builder/builder.css';

type Tab = 'curriculum' | 'students' | 'settings';

export function CourseBuilderPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const [outline, setOutline] = useState<CourseOutline | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('curriculum');
  const [unitModal, setUnitModal] = useState<{ unit?: CourseUnit } | null>(null);
  const [lessonModal, setLessonModal] = useState<{ unit: CourseUnit; module: CourseModule } | null>(null);
  const [moduleModal, setModuleModal] = useState<{ unit: CourseUnit; module?: CourseModule } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setOutline(await curriculumApi.outline(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the course');
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(action: () => Promise<unknown>, success?: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      if (success) setNotice(success);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  if (!outline) {
    return error ? <div className="b-alert b-alert-error">{error}</div> : <div className="b-empty">Loading course…</div>;
  }

  const { course, units } = outline;
  const status = typeof course.status === 'number' ? ['Draft', 'Published', 'Archived'][course.status] : course.status;
  const lessonCount = units.reduce((n, u) => n + u.lessons.filter((l) => !l.videoPending).length, 0);
  const moduleCount = units.reduce((n, u) => n + (u.modules?.length ?? 0), 0);
  const draftCount = units.reduce((n, u) => n + u.lessons.filter((l) => l.status === 'Draft').length + (u.status === 'Draft' ? 1 : 0), 0);

  return (
    <div className="b-page animate-rise">
      <div className="b-head">
        <div className="b-row" style={{ alignItems: 'flex-start', gap: '1rem' }}>
          <div className="b-unit-img" style={{ width: 64, height: 64 }}>
            {course.thumbnailUrl ? <img src={mediaUrl(course.thumbnailUrl) ?? undefined} alt="" style={{ width: 46, height: 46 }} /> : '🇮🇹'}
          </div>
          <div>
            <div className="b-crumbs"><Link to="/app/courses">Courses</Link> <Icon.ChevronRight size={13} /> <span>{course.cefrLevel ?? 'A1'}</span></div>
            <h1>{course.title}</h1>
            <div className="b-row b-wrap" style={{ marginTop: '0.4rem' }}>
              <StatusBadge status={String(status)} />
              <span className="b-badge b-badge-blue">{units.length} units</span>
              <span className="b-badge b-badge-blue">{moduleCount} modules</span>
              <span className="b-badge b-badge-blue">{lessonCount} lessons</span>
              <span className="b-badge b-badge-gold"><Icon.Cap size={13} /> {course.enrolledCount} {course.enrolledCount === 1 ? 'student' : 'students'}</span>
            </div>
          </div>
        </div>
        <div className="b-row b-wrap">
          {draftCount > 0 && (
            <button className="b-btn" disabled={busy} onClick={() => void act(() => curriculumApi.publishAll(course.id), 'All units and lessons are now published.')}>
              Publish all lessons ({draftCount} drafts)
            </button>
          )}
          <button className={`b-btn ${status === 'Published' ? '' : 'b-btn-green'}`} disabled={busy}
            onClick={() => void act(() => (status === 'Published' ? coursesApi.unpublish(course.id) : coursesApi.publish(course.id)),
              status === 'Published' ? 'The course is hidden from students.' : 'The course is live for students.')}>
            {status === 'Published' ? 'Unpublish course' : 'Publish course'}
          </button>
        </div>
      </div>

      {notice && <div className="b-alert b-alert-success">{notice}</div>}
      {error && <div className="b-alert b-alert-error">{error}</div>}

      <div className="b-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'curriculum'} className={`b-tab ${tab === 'curriculum' ? 'active' : ''}`} onClick={() => setTab('curriculum')}>Curriculum</button>
        <button role="tab" aria-selected={tab === 'students'} className={`b-tab ${tab === 'students' ? 'active' : ''}`} onClick={() => setTab('students')}>Students' progress</button>
        <button role="tab" aria-selected={tab === 'settings'} className={`b-tab ${tab === 'settings' ? 'active' : ''}`} onClick={() => setTab('settings')}>Course settings</button>
      </div>

      {tab === 'curriculum' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="b-alert b-alert-info">
            Each <strong>unit</strong> is split into <strong>modules</strong>. Every module starts with its <strong>video lesson</strong> (add the video when it is ready; until then students see “video coming soon” and can continue), then short lessons. Students open modules one after another: the next module unlocks when every lesson of the previous one is done and its test is passed. They only see <strong>published</strong> units and lessons.
          </div>

          {units.length === 0 && (
            <div className="b-card b-empty">
              <span className="big">🧩</span>
              <strong>No units yet</strong>
              <span>Start by adding the first unit, e.g. "Greetings & introductions".</span>
            </div>
          )}

          {units.map((u, i) => (
            <article key={u.id} className="b-card b-unit">
              <div className="b-unit-head">
                <div className="b-unit-img">{u.imageUrl ? <img src={mediaUrl(u.imageUrl) ?? undefined} alt="" /> : <Icon.Layers size={24} />}</div>
                <div className="b-grow">
                  <span className="b-unit-num">Unit {u.order}</span>
                  <h3 className="b-unit-title">{u.title}</h3>
                  {u.titleIt && <span className="b-unit-it">{u.titleIt}</span>}
                </div>
                <StatusBadge status={u.status} />
                <div className="b-unit-tools">
                  <button className="b-icon-btn" title="Move up" disabled={i === 0 || busy} onClick={() => void act(() => curriculumApi.moveUnit(u.id, -1))}><Icon.ArrowUp size={15} /></button>
                  <button className="b-icon-btn" title="Move down" disabled={i === units.length - 1 || busy} onClick={() => void act(() => curriculumApi.moveUnit(u.id, 1))}><Icon.ArrowDown size={15} /></button>
                  <button className="b-btn b-btn-sm" onClick={() => setUnitModal({ unit: u })}>Edit unit</button>
                  <button className="b-icon-btn b-danger" title="Delete unit" disabled={busy}
                    onClick={() => confirm(`Delete unit "${u.title}" and its ${u.lessons.length} lessons? Students' progress in these lessons is deleted too.`) && void act(() => curriculumApi.deleteUnit(u.id), 'Unit deleted.')}><Icon.Trash size={15} /></button>
                </div>
              </div>
              <div className="b-lessons">
                {(u.modules ?? []).map((m, mi, mods) => {
                  const studyLessons = m.lessons.filter((l) => !l.isModuleVideo);
                  return (
                    <section key={m.id} className="b-module">
                      <div className="b-module-head">
                        <span className="b-module-num">Module {m.order}</span>
                        <div className="b-grow">
                          <div className="b-module-title">{m.title}</div>
                          {m.description && <div className="b-lesson-meta">{m.description}</div>}
                        </div>
                        {m.isTest
                          ? <span className="b-badge b-badge-blue">📝 Test module · no video</span>
                          : m.videoReady
                            ? <span className="b-badge b-badge-green">🎬 Video ready</span>
                            : <span className="b-badge b-badge-gold">🎬 Video coming soon</span>}
                        <span className="b-badge b-badge-blue">{m.totalLessons} {m.totalLessons === 1 ? 'lesson' : 'lessons'}</span>
                        <div className="b-unit-tools">
                          <button className="b-icon-btn" title="Move module up" disabled={mi === 0 || busy} onClick={() => void act(() => curriculumApi.moveModule(m.id, -1))}><Icon.ArrowUp size={15} /></button>
                          <button className="b-icon-btn" title="Move module down" disabled={mi === mods.length - 1 || busy} onClick={() => void act(() => curriculumApi.moveModule(m.id, 1))}><Icon.ArrowDown size={15} /></button>
                          <button className="b-btn b-btn-sm" onClick={() => setModuleModal({ unit: u, module: m })}>Edit module</button>
                          <button className="b-icon-btn b-danger" title="Delete module" disabled={busy}
                            onClick={() => confirm(`Delete module "${m.title}" with its video and ${studyLessons.length} lessons? Students' progress in these lessons is deleted too.`) && void act(() => curriculumApi.deleteModule(m.id), 'Module deleted.')}><Icon.Trash size={15} /></button>
                        </div>
                      </div>
                      {m.lessons.map((l) => {
                        const meta = KIND_META[l.kind];
                        const si = studyLessons.findIndex((s) => s.id === l.id);
                        return (
                          <div key={l.id} className={`b-lesson ${l.isModuleVideo ? 'b-lesson-video' : ''}`}>
                            <span className="b-lesson-icon" style={{ background: meta.bg, color: meta.color }}>{meta.emoji}</span>
                            <Link to={`/app/courses/${course.id}/lessons/${l.id}`} className="b-grow">
                              <div className="b-lesson-title">{l.order}. {l.title}</div>
                              <div className="b-lesson-meta">
                                {l.isModuleVideo
                                  ? (l.videoPending ? 'Module video · always first · add the video when it is ready (students skip it until then)' : 'Module video · always first · students watch it before the lessons')
                                  : <>{meta.label} · {l.estimatedMinutes} min · {l.vocabularyCount} words · {l.exerciseCount} exercises
                                    {l.hasVideo ? ' · 🎬 video' : ''}{l.hasPdf ? ' · 📄 PDF' : ''}{l.isFreePreview ? ' · free preview' : ''}</>}
                              </div>
                            </Link>
                            <StatusBadge status={l.status} />
                            <div className="b-lesson-tools">
                              {l.isModuleVideo ? (
                                <Link className="b-btn b-btn-sm" to={`/app/courses/${course.id}/lessons/${l.id}`}>{l.videoPending ? 'Add video' : 'Edit'}</Link>
                              ) : (
                                <>
                                  <button className="b-icon-btn" title="Move up" disabled={si <= 0 || busy} onClick={() => void act(() => curriculumApi.moveLesson(l.id, -1))}><Icon.ArrowUp size={15} /></button>
                                  <button className="b-icon-btn" title="Move down" disabled={si === studyLessons.length - 1 || busy} onClick={() => void act(() => curriculumApi.moveLesson(l.id, 1))}><Icon.ArrowDown size={15} /></button>
                                  <Link className="b-btn b-btn-sm" to={`/app/courses/${course.id}/lessons/${l.id}`}>Edit</Link>
                                  <button className="b-icon-btn b-danger" title="Delete lesson" disabled={busy}
                                    onClick={() => confirm(`Delete lesson "${l.title}"?`) && void act(() => curriculumApi.deleteLesson(l.id), 'Lesson deleted.')}><Icon.Trash size={15} /></button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      <div className="b-add-row">
                        <button className="b-btn b-btn-sm" onClick={() => setLessonModal({ unit: u, module: m })}><Icon.Plus size={15} /> Add lesson to this module</button>
                      </div>
                    </section>
                  );
                })}
                <div className="b-add-row">
                  <button className="b-btn b-btn-sm b-btn-primary" onClick={() => setModuleModal({ unit: u })}><Icon.Plus size={15} /> Add module</button>
                  {u.pdfUrl && <button type="button" className="b-btn b-btn-sm b-btn-ghost" onClick={() => void openDocument(u.pdfUrl!)}>📄 Study sheet</button>}
                </div>
              </div>
            </article>
          ))}

          <div>
            <button className="b-btn b-btn-primary" onClick={() => setUnitModal({})}><Icon.Plus size={15} /> Add unit</button>
          </div>
        </div>
      )}

      {tab === 'students' && <StudentsTab courseId={course.id} />}

      {tab === 'settings' && (
        <div className="b-card b-card-pad" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <CourseForm course={course} onSaved={() => { setNotice('Course details saved.'); void load(); }} />
          {hasRole('Admin', 'SuperAdmin') && (
            <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '1.25rem' }}>
              <h3 style={{ margin: '0 0 0.4rem', color: 'var(--danger)' }}>Delete course</h3>
              <p className="b-muted b-small" style={{ margin: '0 0 0.75rem' }}>Deletes the course, all units, lessons and students' progress. This can't be undone.</p>
              <button className="b-btn b-btn-danger" disabled={busy}
                onClick={() => confirm(`Permanently delete "${course.title}" with all its lessons and students' progress? This can't be undone.`) && void act(async () => { await coursesApi.delete(course.id); navigate('/app/courses'); })}>
                Delete this course
              </button>
            </div>
          )}
        </div>
      )}

      {unitModal && (
        <UnitModal unit={unitModal.unit} onClose={() => setUnitModal(null)}
          onSave={(body) => act(async () => {
            if (unitModal.unit) await curriculumApi.updateUnit(unitModal.unit.id, body);
            else await curriculumApi.createUnit(course.id, body);
            setUnitModal(null);
          }, unitModal.unit ? 'Unit saved.' : 'Unit added.')} />
      )}

      {lessonModal && (
        <NewLessonModal unit={lessonModal.unit} module={lessonModal.module} onClose={() => setLessonModal(null)}
          onCreate={async (kind, title) => {
            const lesson = await curriculumApi.createLessonInModule(lessonModal.module.id, lessonTemplate(kind, title));
            navigate(`/app/courses/${course.id}/lessons/${lesson.id}`);
          }} />
      )}

      {moduleModal && (
        <ModuleModal unit={moduleModal.unit} module={moduleModal.module} onClose={() => setModuleModal(null)}
          onSave={(body) => act(async () => {
            if (moduleModal.module) await curriculumApi.updateModule(moduleModal.module.id, body);
            else await curriculumApi.createModule(moduleModal.unit.id, body);
            setModuleModal(null);
          }, moduleModal.module ? 'Module saved.' : 'Module added with its video lesson. Add the video when it is ready.')} />
      )}
    </div>
  );
}

function UnitModal({ unit, onClose, onSave }: { unit?: CourseUnit; onClose: () => void; onSave: (body: SaveUnitRequest) => Promise<void> }) {
  const [title, setTitle] = useState(unit?.title ?? '');
  const [titleIt, setTitleIt] = useState(unit?.titleIt ?? '');
  const [description, setDescription] = useState(unit?.description ?? '');
  const [canDo, setCanDo] = useState((unit?.canDo ?? []).join('\n'));
  const [imageUrl, setImageUrl] = useState<string | null>(unit?.imageUrl ?? null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(unit?.pdfUrl ?? null);
  const [liveClassFocus, setLiveClassFocus] = useState(unit?.liveClassFocus ?? '');
  const [status, setStatus] = useState(unit?.status ?? 'Draft');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await onSave({ title, titleIt, description, canDo: canDo.split('\n').map((s) => s.trim()).filter(Boolean), imageUrl, pdfUrl, liveClassFocus, status });
    setSaving(false);
  }

  return (
    <Modal title={unit ? `Edit unit ${unit.order}` : 'New unit'} onClose={onClose} wide
      footer={<><button className="b-btn" onClick={onClose}>Cancel</button><button className="b-btn b-btn-primary" disabled={!title.trim() || saving} onClick={() => void save()}>{saving ? 'Saving…' : 'Save unit'}</button></>}>
      <div className="b-grid-2">
        <div className="b-field">
          <label className="b-label" htmlFor="u-title">Title (English)</label>
          <input id="u-title" className="b-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. At the doctor's" autoFocus />
        </div>
        <div className="b-field">
          <label className="b-label" htmlFor="u-title-it">Title (Italian)</label>
          <input id="u-title-it" className="b-input b-input-it" value={titleIt} onChange={(e) => setTitleIt(e.target.value)} placeholder="e.g. Dal medico" />
        </div>
      </div>
      <div className="b-field">
        <label className="b-label" htmlFor="u-desc">Description</label>
        <textarea id="u-desc" className="b-textarea" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="b-field">
        <label className="b-label" htmlFor="u-cando">Learning goals — "I can…" (one per line)</label>
        <textarea id="u-cando" className="b-textarea" rows={4} value={canDo} onChange={(e) => setCanDo(e.target.value)} placeholder={'I can explain to a doctor what hurts\nI can understand instructions from a pharmacist'} />
      </div>
      <div className="b-field">
        <label className="b-label" htmlFor="u-live">Live class this week — what students practise</label>
        <textarea id="u-live" className="b-textarea" rows={2} value={liveClassFocus} onChange={(e) => setLiveClassFocus(e.target.value)} />
      </div>
      <div className="b-grid-2">
        <MediaField kind="image" label="Unit illustration" value={imageUrl} onChange={setImageUrl} />
        <MediaField kind="pdf" label="Study sheet (PDF)" value={pdfUrl} onChange={setPdfUrl} />
      </div>
      <label className="b-check"><input type="checkbox" checked={status === 'Published'} onChange={(e) => setStatus(e.target.checked ? 'Published' : 'Draft')} /> Published (visible to students)</label>
    </Modal>
  );
}

function ModuleModal({ unit, module, onClose, onSave }: { unit: CourseUnit; module?: CourseModule; onClose: () => void; onSave: (body: SaveModuleRequest) => Promise<void> }) {
  const [title, setTitle] = useState(module?.title ?? '');
  const [titleIt, setTitleIt] = useState(module?.titleIt ?? '');
  const [description, setDescription] = useState(module?.description ?? '');
  const [imageUrl, setImageUrl] = useState<string | null>(module?.imageUrl ?? null);
  const [isTest, setIsTest] = useState(module?.isTest ?? false);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await onSave({ title: title.trim(), titleIt: titleIt.trim(), description: description.trim(), imageUrl, isTest });
    setSaving(false);
  }

  return (
    <Modal title={module ? `Edit module ${module.order} of Unit ${unit.order}` : `New module in Unit ${unit.order}`} onClose={onClose}
      footer={<><button className="b-btn" onClick={onClose}>Cancel</button><button className="b-btn b-btn-primary" disabled={!title.trim() || saving} onClick={() => void save()}>{saving ? 'Saving…' : module ? 'Save module' : 'Create module'}</button></>}>
      {!module && !isTest && <div className="b-alert b-alert-info">The module starts with a <strong>video lesson</strong> automatically. Add the video to it when it is ready — until then students see “video coming soon” and can go on.</div>}
      <div className="b-grid-2">
        <div className="b-field">
          <label className="b-label" htmlFor="m-title">Title (English)</label>
          <input id="m-title" className="b-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Introducing yourself" autoFocus />
        </div>
        <div className="b-field">
          <label className="b-label" htmlFor="m-title-it">Title (Italian)</label>
          <input id="m-title-it" className="b-input b-input-it" value={titleIt} onChange={(e) => setTitleIt(e.target.value)} placeholder="e.g. Presentarsi" />
        </div>
      </div>
      <div className="b-field">
        <label className="b-label" htmlFor="m-desc">Short description (shown on the module card)</label>
        <textarea id="m-desc" className="b-textarea" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Say your name, where you are from and how old you are" />
      </div>
      <MediaField kind="image" label="Card illustration (optional)" value={imageUrl} onChange={setImageUrl} />
      <label className="b-check">
        <input type="checkbox" checked={isTest} onChange={(e) => setIsTest(e.target.checked)} />
        Test module (e.g. the chapter test): no video lesson. Add the test as a “Test” lesson.
      </label>
    </Modal>
  );
}

function NewLessonModal({ unit, module, onClose, onCreate }: { unit: CourseUnit; module: CourseModule; onClose: () => void; onCreate: (kind: LessonKind, title: string) => Promise<void> }) {
  const [kind, setKind] = useState<LessonKind>('Vocabulary');
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      await onCreate(kind, title.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the lesson');
      setBusy(false);
    }
  }

  return (
    <Modal title={`New lesson in Unit ${unit.order} · Module ${module.order}`} onClose={onClose}
      footer={<><button className="b-btn" onClick={onClose}>Cancel</button><button className="b-btn b-btn-primary" disabled={!title.trim() || busy} onClick={() => void create()}>{busy ? 'Creating…' : 'Create and edit'}</button></>}>
      {error && <div className="b-alert b-alert-error">{error}</div>}
      <label className="b-label">Lesson type</label>
      <div className="b-grid-2">
        {(Object.keys(KIND_META) as LessonKind[]).map((k) => {
          const m = KIND_META[k];
          return (
            <button key={k} type="button" onClick={() => setKind(k)} className="b-card"
              style={{ textAlign: 'left', padding: '0.8rem', cursor: 'pointer', borderColor: kind === k ? 'var(--primary)' : undefined, boxShadow: kind === k ? '0 0 0 3px var(--primary-light)' : undefined, background: 'var(--card-bg)', color: 'inherit' }}>
              <div className="b-row"><span className="b-lesson-icon" style={{ background: m.bg, color: m.color }}>{m.emoji}</span><strong>{m.label}</strong></div>
              <div className="b-muted b-small" style={{ marginTop: '0.35rem' }}>{m.help}</div>
            </button>
          );
        })}
      </div>
      <div className="b-field">
        <label className="b-label" htmlFor="l-title">Lesson title</label>
        <input id="l-title" className="b-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Parts of the body" autoFocus />
      </div>
    </Modal>
  );
}

function StudentsTab({ courseId }: { courseId: string }) {
  const [rows, setRows] = useState<StudentCourseProgress[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    curriculumApi.students(courseId).then(setRows).catch((e) => setError(e instanceof Error ? e.message : 'Could not load students'));
  }, [courseId]);

  if (error) return <div className="b-alert b-alert-error">{error}</div>;
  if (!rows) return <div className="b-empty">Loading students…</div>;
  if (rows.length === 0) return <div className="b-card b-empty"><span className="big">🎓</span><strong>No students enrolled yet</strong></div>;

  return (
    <div className="b-card" style={{ overflowX: 'auto' }}>
      <table className="b-table">
        <thead>
          <tr><th>Student</th><th>Progress</th><th>Lessons</th><th>Stars</th><th>Avg. score</th><th>XP</th><th>Last activity</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.userId}>
              <td><strong>{r.fullName}</strong><div className="b-muted b-small">{r.email}</div></td>
              <td style={{ minWidth: 150 }}>
                <div className="b-row"><div className="b-progress b-grow"><span style={{ width: `${r.completionPercent}%` }} /></div><strong className="b-small">{r.completionPercent}%</strong></div>
              </td>
              <td>{r.completedLessons} / {r.totalLessons}</td>
              <td>⭐ {r.stars}</td>
              <td>{r.averageScorePercent}%</td>
              <td>{r.xpEarned}</td>
              <td className="b-small">{r.lastActivityAtUtc ? new Date(r.lastActivityAtUtc).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
