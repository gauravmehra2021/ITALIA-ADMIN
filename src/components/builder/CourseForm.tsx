import { useState, type FormEvent } from 'react';
import { coursesApi } from '../../services/platformApi';
import type { Course } from '../../types';
import { MediaField } from './BuilderKit';

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const LEVEL_BY_CEFR: Record<string, string> = { A1: 'Beginner', A2: 'Beginner', B1: 'Intermediate', B2: 'Intermediate', C1: 'Advanced', C2: 'Advanced' };

export const CATEGORIES = [
  { id: 'Core', label: 'Core course (CEFR level)' },
  { id: 'Work', label: 'Italian for work' },
  { id: 'Study', label: 'Italian for students' },
  { id: 'Visit', label: 'Italian for visitors' },
];

const enumName = (v: unknown, names: string[]) => (typeof v === 'number' ? names[v] ?? names[0] : String(v ?? names[0]));

/** Create or edit a course's details. */
export function CourseForm({ course, onSaved, onCancel, submitLabel }: {
  course?: Course;
  onSaved: (c: Course) => void;
  onCancel?: () => void;
  submitLabel?: string;
}) {
  const [title, setTitle] = useState(course?.title ?? '');
  const [shortDescription, setShortDescription] = useState(course?.shortDescription ?? '');
  const [description, setDescription] = useState(course?.description ?? '');
  const [objectives, setObjectives] = useState(course?.objectives ?? '');
  const [cefrLevel, setCefrLevel] = useState(course?.cefrLevel ?? 'A1');
  const [category, setCategory] = useState(course?.category ?? 'Core');
  const [durationWeeks, setDurationWeeks] = useState(course?.durationWeeks ?? 10);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(course?.thumbnailUrl ?? null);
  const [status, setStatus] = useState(enumName(course?.status, ['Draft', 'Published', 'Archived']));
  const [displayOrder, setDisplayOrder] = useState(course?.displayOrder ?? 0);
  const [openToAll, setOpenToAll] = useState(course?.openToAll ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Editing a course that students can already see: optionally tell them what changed.
  const wasPublished = enumName(course?.status, ['Draft', 'Published', 'Archived']) === 'Published';
  const [notifyStudents, setNotifyStudents] = useState(false);
  const [updateNote, setUpdateNote] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body = {
      title: title.trim(),
      shortDescription: shortDescription.trim(),
      description: description.trim() || shortDescription.trim() || title.trim(),
      objectives: objectives.trim(),
      level: LEVEL_BY_CEFR[cefrLevel] ?? 'Beginner',
      cefrLevel,
      category,
      durationWeeks: Number(durationWeeks) || 0,
      thumbnailUrl,
      status,
      displayOrder: Number(displayOrder) || 0,
      openToAll,
      capacity: course?.capacity ?? 9999,
      mentorId: course?.mentorId ?? null,
      language: 'Italian',
      price: 0,
      currency: 'EUR',
      // Publishing a draft always tells the course's students; for edits it's the editor's choice.
      notifyStudents: wasPublished && status === 'Published' && notifyStudents,
      updateNote: notifyStudents ? updateNote.trim() || null : null,
    };
    try {
      const saved = course ? await coursesApi.update(course.id, body) : await coursesApi.create(body);
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the course');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      {error && <div className="b-alert b-alert-error">{error}</div>}
      <div className="b-field">
        <label className="b-label" htmlFor="c-title">Course title</label>
        <input id="c-title" className="b-input" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Italian A2 — Everyday life" />
      </div>
      <div className="b-field">
        <label className="b-label" htmlFor="c-short">Short description (shown on the course card)</label>
        <input id="c-short" className="b-input" value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} maxLength={220} placeholder="One sentence: who the course is for and what they will learn" />
      </div>
      <div className="b-grid-4">
        <div className="b-field">
          <label className="b-label" htmlFor="c-cefr">CEFR level</label>
          <select id="c-cefr" className="b-select" value={cefrLevel} onChange={(e) => setCefrLevel(e.target.value)}>
            {/* Built-in courses can have a level outside the list (e.g. "A0–A2"): keep it selectable. */}
            {[...(CEFR_LEVELS.includes(cefrLevel) ? [] : [cefrLevel]), ...CEFR_LEVELS].map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>
        <div className="b-field">
          <label className="b-label" htmlFor="c-cat">Type</label>
          <select id="c-cat" className="b-select" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <div className="b-field">
          <label className="b-label" htmlFor="c-weeks">Duration (weeks)</label>
          <input id="c-weeks" className="b-input" type="number" min={0} max={104} value={durationWeeks} onChange={(e) => setDurationWeeks(Number(e.target.value))} />
        </div>
        <div className="b-field">
          <label className="b-label" htmlFor="c-status">Visibility</label>
          <select id="c-status" className="b-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="Draft">Draft (hidden)</option>
            <option value="Published">Published</option>
            <option value="Archived">Archived</option>
          </select>
        </div>
      </div>
      <MediaField kind="image" label="Cover illustration" value={thumbnailUrl} onChange={setThumbnailUrl} />
      <div className="b-field">
        <label className="b-label" htmlFor="c-desc">Full description</label>
        <textarea id="c-desc" className="b-textarea" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
      </div>
      <div className="b-field">
        <label className="b-label" htmlFor="c-obj">What students will learn (one per line)</label>
        <textarea id="c-obj" className="b-textarea" value={objectives} onChange={(e) => setObjectives(e.target.value)} rows={4} placeholder={'Introduce yourself and your family\nOrder at a restaurant'} />
      </div>
      <div className="b-field" style={{ maxWidth: 200 }}>
        <label className="b-label" htmlFor="c-order">Order in catalogue</label>
        <input id="c-order" className="b-input" type="number" value={displayOrder} onChange={(e) => setDisplayOrder(Number(e.target.value))} />
      </div>
      <label className="b-check">
        <input type="checkbox" checked={openToAll} onChange={(e) => setOpenToAll(e.target.checked)} />
        Open to every student (e.g. a free demo course). Other courses are opened only through a batch.
      </label>
      {course && wasPublished && status === 'Published' && (
        <div className="b-field">
          <label className="b-check">
            <input type="checkbox" checked={notifyStudents} onChange={(e) => setNotifyStudents(e.target.checked)} />
            Tell this course's students about this update (they get a notification)
          </label>
          {notifyStudents && (
            <input className="b-input" value={updateNote} maxLength={300} onChange={(e) => setUpdateNote(e.target.value)}
              placeholder="What changed? e.g. New speaking practice added to Chapter 3" aria-label="Update message" />
          )}
        </div>
      )}
      {course && !wasPublished && status === 'Published' && (
        <p className="b-hint" style={{ margin: 0 }}>Publishing sends a "New course" notification to the students who can open it.</p>
      )}
      <div className="b-row" style={{ justifyContent: 'flex-end' }}>
        {onCancel && <button type="button" className="b-btn" onClick={onCancel}>Cancel</button>}
        <button className="b-btn b-btn-primary" disabled={busy}>{busy ? 'Saving…' : submitLabel ?? (course ? 'Save changes' : 'Create course')}</button>
      </div>
    </form>
  );
}
