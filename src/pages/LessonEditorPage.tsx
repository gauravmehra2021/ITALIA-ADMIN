import { Icon } from '../components/Icons';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { curriculumApi } from '../services/platformApi';
import { KIND_META, StatusBadge } from '../components/builder/BuilderKit';
import { BLOCK_LABELS, BlockEditor } from '../components/builder/BlockEditors';
import { EXERCISE_LABELS, ExerciseEditor, exerciseProblems, generatePractice, newExercise } from '../components/builder/ExerciseEditors';
import { emptyBlock, emptyWord } from '../components/builder/templates';
import type { BlockType, CourseUnit, ExerciseType, LessonBlock, LessonDetail, LessonExercise, LessonKind, LessonStatus, SaveLessonRequest } from '../types';
import '../components/builder/builder.css';

function toRequest(l: LessonDetail): SaveLessonRequest {
  return {
    title: l.title,
    titleIt: l.titleIt,
    kind: l.kind,
    summary: l.summary,
    estimatedMinutes: l.estimatedMinutes,
    xpReward: l.xpReward,
    status: l.status,
    isFreePreview: l.isFreePreview,
    blocks: l.blocks,
    exercises: l.exercises,
    homework: l.homework ?? '',
    unitId: l.unitId,
  };
}

/** Removes empty rows so students never see blank cards. */
function clean(req: SaveLessonRequest): SaveLessonRequest {
  return {
    ...req,
    blocks: req.blocks.map((b) => ({
      ...b,
      items: b.items.filter((i) => i.italian.trim() || i.english.trim()),
      lines: b.lines.filter((l) => l.italian.trim()),
      table: b.table.filter((row, i) => i === 0 || row.some((c) => c.trim())),
    })),
    exercises: req.exercises.map((e) => ({
      ...e,
      pairs: e.pairs.filter((p) => p.left.trim() && p.right.trim()),
    })),
  };
}

export function LessonEditorPage() {
  const { id: courseId = '', lessonId = '' } = useParams();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [draft, setDraft] = useState<SaveLessonRequest | null>(null);
  const [units, setUnits] = useState<CourseUnit[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [openBlock, setOpenBlock] = useState<number | null>(0);
  const [openEx, setOpenEx] = useState<number | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [l, outline] = await Promise.all([curriculumApi.lesson(lessonId), curriculumApi.outline(courseId)]);
      setLesson(l);
      setDraft(toRequest(l));
      setUnits(outline.units);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the lesson');
    }
  }, [courseId, lessonId]);

  useEffect(() => {
    void load();
    setOpenBlock(0);
    setOpenEx(null);
  }, [load]);

  const dirty = useMemo(() => lesson && draft && JSON.stringify(toRequest(lesson)) !== JSON.stringify(draft), [lesson, draft]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  // Ctrl/Cmd + S saves.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void save();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!draft || !lesson) {
    return error ? <div className="b-alert b-alert-error">{error}</div> : <div className="b-empty">Loading lesson…</div>;
  }

  const set = (patch: Partial<SaveLessonRequest>) => setDraft({ ...draft, ...patch });
  const setBlock = (i: number, b: LessonBlock) => set({ blocks: draft.blocks.map((x, j) => (j === i ? b : x)) });
  const setExercise = (i: number, e: LessonExercise) => set({ exercises: draft.exercises.map((x, j) => (j === i ? e : x)) });
  const moveIn = <T,>(list: T[], i: number, d: number) => {
    const next = [...list];
    const t = i + d;
    if (t < 0 || t >= next.length) return list;
    [next[i], next[t]] = [next[t], next[i]];
    return next;
  };

  const words = draft.blocks.filter((b) => b.type === 'Vocabulary' && b.title !== 'Examples').flatMap((b) => b.items);
  const problems = draft.exercises.map(exerciseProblems);
  const problemCount = problems.filter((p) => p.length).length;

  async function save(statusOverride?: LessonStatus) {
    if (!draft) return;
    if (!draft.title.trim()) {
      setError('The lesson needs a title.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body = clean({ ...draft, status: statusOverride ?? draft.status });
      const saved = await curriculumApi.updateLesson(lessonId, body);
      setLesson(saved);
      setDraft(toRequest(saved));
      setSavedAt(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  const addBlock = (type: BlockType) => {
    const block = type === 'Vocabulary' ? emptyBlock('Vocabulary', { title: 'New words', items: [emptyWord()] })
      : type === 'Dialogue' ? emptyBlock('Dialogue', { lines: [{ speaker: '', italian: '', english: '' }, { speaker: '', italian: '', english: '' }] })
      : type === 'Table' ? emptyBlock('Table', { table: [['', ''], ['', '']] })
      : type === 'Tip' ? emptyBlock('Tip', { title: 'Good to know' })
      : emptyBlock(type);
    set({ blocks: [...draft.blocks, block] });
    setOpenBlock(draft.blocks.length);
  };

  const addExercise = (type: ExerciseType) => {
    set({ exercises: [...draft.exercises, newExercise(type)] });
    setOpenEx(draft.exercises.length);
  };

  const generate = () => {
    const generated = generatePractice(words);
    if (generated.length === 0) {
      setError('Add at least 4 words (Italian + English) to generate practice exercises. Add pictures for listening exercises.');
      return;
    }
    set({ exercises: [...generated, ...draft.exercises] });
    setOpenEx(null);
  };

  const goTo = (id?: string | null) => {
    if (!id) return;
    if (dirty && !confirm('You have unsaved changes. Leave without saving?')) return;
    navigate(`/app/courses/${courseId}/lessons/${id}`);
  };

  const meta = KIND_META[draft.kind];

  return (
    <div className="b-page animate-rise">
      <div className="b-savebar">
        <div className="b-row" style={{ minWidth: 0 }}>
          <Link to={`/app/courses/${courseId}`} className="b-btn b-btn-sm" onClick={(e) => { if (dirty && !confirm('You have unsaved changes. Leave without saving?')) e.preventDefault(); }}><Icon.ArrowLeft size={15} /> Course</Link>
          <span className="b-lesson-icon" style={{ background: meta.bg, color: meta.color }}>{meta.emoji}</span>
          <div style={{ minWidth: 0 }}>
            <div className="b-muted b-small">{lesson.unitTitle} · Lesson {lesson.order}</div>
            <strong style={{ color: 'var(--ink)' }}>{draft.title || 'Untitled lesson'}</strong>
          </div>
          <StatusBadge status={draft.status} />
        </div>
        <div className="b-row b-wrap">
          {dirty ? <span className="b-dirty">● Unsaved changes</span> : savedAt ? <span className="b-saved">✓ Saved {savedAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span> : null}
          <button className="b-icon-btn" title="Previous lesson" disabled={!lesson.previousLessonId} onClick={() => goTo(lesson.previousLessonId)}>‹</button>
          <button className="b-icon-btn" title="Next lesson" disabled={!lesson.nextLessonId} onClick={() => goTo(lesson.nextLessonId)}>›</button>
          {draft.status === 'Draft' && <button className="b-btn b-btn-green" disabled={saving} onClick={() => void save('Published')}>Save & publish</button>}
          <button className="b-btn b-btn-primary" disabled={saving || !dirty} onClick={() => void save()}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>

      {error && <div className="b-alert b-alert-error">{error}</div>}

      <div className="b-editor">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Details */}
          <section className="b-card">
            <div className="b-card-head"><h2>Lesson details</h2></div>
            <div className="b-card-pad" style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div className="b-grid-2">
                <div className="b-field">
                  <label className="b-label" htmlFor="l-title">Title (English)</label>
                  <input id="l-title" className="b-input" value={draft.title} onChange={(e) => set({ title: e.target.value })} />
                </div>
                <div className="b-field">
                  <label className="b-label" htmlFor="l-title-it">Title (Italian)</label>
                  <input id="l-title-it" className="b-input b-input-it" value={draft.titleIt ?? ''} onChange={(e) => set({ titleIt: e.target.value })} />
                </div>
              </div>
              <div className="b-field">
                <label className="b-label" htmlFor="l-summary">Summary (one sentence shown in the course outline)</label>
                <input id="l-summary" className="b-input" value={draft.summary ?? ''} onChange={(e) => set({ summary: e.target.value })} />
              </div>
              <div className="b-grid-4">
                <div className="b-field">
                  <label className="b-label" htmlFor="l-kind">Type</label>
                  <select id="l-kind" className="b-select" value={draft.kind} onChange={(e) => set({ kind: e.target.value as LessonKind })}>
                    {(Object.keys(KIND_META) as LessonKind[]).map((k) => <option key={k} value={k}>{KIND_META[k].emoji} {KIND_META[k].label}</option>)}
                  </select>
                </div>
                <div className="b-field">
                  <label className="b-label" htmlFor="l-unit">Unit</label>
                  <select id="l-unit" className="b-select" value={draft.unitId} onChange={(e) => set({ unitId: e.target.value })}>
                    {units.map((u) => <option key={u.id} value={u.id}>Unit {u.order}: {u.title}</option>)}
                  </select>
                </div>
                <div className="b-field">
                  <label className="b-label" htmlFor="l-min">Minutes</label>
                  <input id="l-min" className="b-input" type="number" min={1} max={180} value={draft.estimatedMinutes} onChange={(e) => set({ estimatedMinutes: Number(e.target.value) })} />
                </div>
                <div className="b-field">
                  <label className="b-label" htmlFor="l-xp">XP reward</label>
                  <input id="l-xp" className="b-input" type="number" min={0} max={500} value={draft.xpReward} onChange={(e) => set({ xpReward: Number(e.target.value) })} />
                </div>
              </div>
              <div className="b-row b-wrap" style={{ gap: '1.25rem' }}>
                <label className="b-check"><input type="checkbox" checked={draft.status === 'Published'} onChange={(e) => set({ status: e.target.checked ? 'Published' : 'Draft' })} /> Published</label>
                <label className="b-check"><input type="checkbox" checked={draft.isFreePreview} onChange={(e) => set({ isFreePreview: e.target.checked })} /> Free preview (open before enrolling)</label>
              </div>
            </div>
          </section>

          {/* Blocks */}
          <section className="b-card">
            <div className="b-card-head">
              <h2>1 · Learn — content</h2>
              <span className="b-muted b-small">Shown top to bottom</span>
            </div>
            <div className="b-card-pad" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {draft.blocks.length === 0 && <p className="b-muted">No content yet. Add words, a dialogue, an explanation or a video below.</p>}
              {draft.blocks.map((b, i) => {
                const info = BLOCK_LABELS[b.type];
                const open = openBlock === i;
                const summary = b.type === 'Vocabulary' ? `${b.items.length} items` : b.type === 'Dialogue' ? `${b.lines.length} lines` : b.type === 'Table' ? `${b.table.length} rows` : (b.title || b.body || b.mediaUrl || '').slice(0, 60);
                return (
                  <div key={i} className="b-block">
                    <div className="b-block-head">
                      <button type="button" className="b-btn b-btn-sm b-btn-ghost" onClick={() => setOpenBlock(open ? null : i)} aria-expanded={open}>{open ? '▾' : '▸'}</button>
                      <span>{info.emoji}</span>
                      <span className="b-block-type">{info.label}</span>
                      {!open && <span className="b-muted b-small" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title && b.type !== 'Text' ? `${b.title} · ` : ''}{summary}</span>}
                      <div className="b-block-tools">
                        <button type="button" className="b-icon-btn" title="Move up" disabled={i === 0} onClick={() => { set({ blocks: moveIn(draft.blocks, i, -1) }); setOpenBlock(i - 1); }}><Icon.ArrowUp size={15} /></button>
                        <button type="button" className="b-icon-btn" title="Move down" disabled={i === draft.blocks.length - 1} onClick={() => { set({ blocks: moveIn(draft.blocks, i, 1) }); setOpenBlock(i + 1); }}><Icon.ArrowDown size={15} /></button>
                        <button type="button" className="b-icon-btn b-danger" title="Remove" onClick={() => confirm(`Remove this ${info.label.toLowerCase()} block?`) && set({ blocks: draft.blocks.filter((_, j) => j !== i) })}><Icon.Trash size={15} /></button>
                      </div>
                    </div>
                    {open && (
                      <div className="b-block-body">
                        <p className="b-hint" style={{ margin: 0 }}>{info.help}</p>
                        <BlockEditor block={b} onChange={(nb) => setBlock(i, nb)} />
                      </div>
                    )}
                  </div>
                );
              })}
              <div>
                <div className="b-label">Add content</div>
                <div className="b-menu">
                  {(Object.keys(BLOCK_LABELS) as BlockType[]).map((t) => (
                    <button key={t} type="button" className="b-btn b-btn-sm" onClick={() => addBlock(t)}>{BLOCK_LABELS[t].emoji} {BLOCK_LABELS[t].label}</button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Exercises */}
          <section className="b-card">
            <div className="b-card-head">
              <h2>2 · Practice — exercises</h2>
              <button type="button" className="b-btn b-btn-sm b-btn-green" onClick={generate} title="Creates listening, picture, translation and matching exercises from this lesson's words">
                ✨ Generate from words ({words.length})
              </button>
            </div>
            <div className="b-card-pad" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {draft.exercises.length === 0 && <p className="b-muted">No exercises yet. Students earn 1–3 stars from their score: aim for 6–10 exercises per lesson.</p>}
              {draft.exercises.map((ex, i) => {
                const info = EXERCISE_LABELS[ex.type];
                const open = openEx === i;
                return (
                  <div key={i} className="b-ex" style={problems[i].length ? { borderColor: '#f0c36a' } : undefined}>
                    <div className="b-ex-head">
                      <span className="b-ex-num">{i + 1}</span>
                      <button type="button" className="b-btn b-btn-sm b-btn-ghost" onClick={() => setOpenEx(open ? null : i)} aria-expanded={open}>{open ? '▾' : '▸'}</button>
                      <span>{info.emoji}</span>
                      <strong className="b-small">{info.label}</strong>
                      <span className="b-muted b-small b-grow" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ex.italian || ex.answer || ex.pairs.map((p) => p.left).filter(Boolean).join(', ') || ex.prompt}
                      </span>
                      {problems[i].length > 0 && <span className="b-badge b-badge-gold" title={problems[i].join(', ')}>⚠ {problems[i][0]}</span>}
                      <button type="button" className="b-icon-btn" title="Move up" disabled={i === 0} onClick={() => { set({ exercises: moveIn(draft.exercises, i, -1) }); setOpenEx(i - 1); }}><Icon.ArrowUp size={15} /></button>
                      <button type="button" className="b-icon-btn" title="Move down" disabled={i === draft.exercises.length - 1} onClick={() => { set({ exercises: moveIn(draft.exercises, i, 1) }); setOpenEx(i + 1); }}><Icon.ArrowDown size={15} /></button>
                      <button type="button" className="b-icon-btn b-danger" title="Remove" onClick={() => set({ exercises: draft.exercises.filter((_, j) => j !== i) })}><Icon.Trash size={15} /></button>
                    </div>
                    {open && (
                      <div className="b-ex-body">
                        <p className="b-hint" style={{ margin: 0 }}>{info.help}</p>
                        <ExerciseEditor exercise={ex} onChange={(ne) => setExercise(i, ne)} />
                      </div>
                    )}
                  </div>
                );
              })}
              <div>
                <div className="b-label">Add exercise</div>
                <div className="b-menu">
                  {(Object.keys(EXERCISE_LABELS) as ExerciseType[]).map((t) => (
                    <button key={t} type="button" className="b-btn b-btn-sm" onClick={() => addExercise(t)}>{EXERCISE_LABELS[t].emoji} {EXERCISE_LABELS[t].label}</button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Homework */}
          <section className="b-card">
            <div className="b-card-head"><h2>3 · Homework for the live class</h2></div>
            <div className="b-card-pad">
              <textarea className="b-textarea" rows={3} value={draft.homework ?? ''} onChange={(e) => set({ homework: e.target.value })}
                placeholder="A short speaking or writing task students prepare for the weekly live class." />
            </div>
          </section>
        </div>

        <aside className="b-editor-side">
          <section className="b-card b-card-pad">
            <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>Lesson checklist</h3>
            <ul className="b-checklist">
              <Check ok={Boolean(draft.title.trim() && draft.titleIt?.trim())}>English and Italian title</Check>
              <Check ok={draft.blocks.length > 0}>Learning content ({draft.blocks.length} blocks)</Check>
              {(draft.kind === 'Vocabulary') && <Check ok={words.length >= 6}>6–12 words ({words.length})</Check>}
              {(draft.kind === 'Vocabulary') && <Check ok={words.length > 0 && words.every((w) => w.imageUrl)}>Every word has a picture</Check>}
              <Check ok={draft.exercises.length >= 5}>At least 5 exercises ({draft.exercises.length})</Check>
              <Check ok={problemCount === 0}>{problemCount === 0 ? 'All exercises complete' : `${problemCount} exercise(s) need attention`}</Check>
              <Check ok={Boolean(draft.homework?.trim())}>Homework for the live class</Check>
              <Check ok={draft.status === 'Published'}>Published</Check>
            </ul>
          </section>
          <section className="b-card b-card-pad b-small" style={{ color: 'var(--ink-soft)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <strong style={{ color: 'var(--ink)' }}>Tips</strong>
            <span>🔊 Audio is automatic: every Italian word plays with the student's device voice.</span>
            <span>🖼️ Pick from 140+ built-in illustrations, or upload your own pictures.</span>
            <span>⭐ Stars: 90%+ = 3, 70%+ = 2, 50%+ = 1. Below 50% the lesson isn't completed.</span>
            <span>⌨️ Press Ctrl + S to save.</span>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Check({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <li><span className={ok ? 'ok' : 'todo'}>{ok ? '✓' : '○'}</span><span>{children}</span></li>
  );
}
