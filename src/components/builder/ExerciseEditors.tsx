import { Icon } from '../Icons';
import type { ExerciseType, LessonExercise, VocabularyItem } from '../../types';
import { ListenButton, MediaField } from './BuilderKit';

export const EXERCISE_LABELS: Record<ExerciseType, { label: string; emoji: string; help: string }> = {
  ListenPick: { label: 'Listen & choose', emoji: '🔊', help: 'Students hear the Italian and choose the right picture (or word).' },
  PickWord: { label: 'Picture → word', emoji: '🖼️', help: 'Students see a picture and choose the Italian word.' },
  PickTranslation: { label: 'Multiple choice', emoji: '🔤', help: 'A question or Italian text with 2–4 answers.' },
  FillBlank: { label: 'Fill the gap', emoji: '✏️', help: 'Write the sentence with ___ where the missing word goes.' },
  TrueFalse: { label: 'True / false', emoji: '✅', help: 'A statement about the dialogue or reading.' },
  MatchPairs: { label: 'Match pairs', emoji: '🔗', help: 'Students match Italian words with their meaning.' },
  WordOrder: { label: 'Word order', emoji: '🧩', help: 'Students put the words of an Italian sentence in order.' },
};

export function newExercise(type: ExerciseType): LessonExercise {
  const base: LessonExercise = { type, prompt: '', italian: '', imageUrl: null, options: [], correctIndex: 0, answer: '', pairs: [], explanation: '' };
  switch (type) {
    case 'ListenPick':
      return { ...base, prompt: 'Listen and choose the right picture', options: [{ text: '' }, { text: '' }, { text: '' }, { text: '' }] };
    case 'PickWord':
      return { ...base, prompt: 'What is this in Italian?', options: [{ text: '' }, { text: '' }, { text: '' }, { text: '' }] };
    case 'FillBlank':
      return { ...base, prompt: 'Choose the missing word', italian: 'Io ___ italiano.', options: [{ text: '' }, { text: '' }, { text: '' }] };
    case 'TrueFalse':
      return { ...base, prompt: 'True or false?', options: [{ text: 'Vero (true)' }, { text: 'Falso (false)' }] };
    case 'MatchPairs':
      return { ...base, prompt: 'Match the Italian words with their meaning', pairs: [{ left: '', right: '' }, { left: '', right: '' }, { left: '', right: '' }] };
    case 'WordOrder':
      return { ...base, prompt: 'Put the words in order: "…"' };
    default:
      return { ...base, prompt: 'What does it mean?', options: [{ text: '' }, { text: '' }, { text: '' }] };
  }
}

/** Keeps the same answer marked correct after removing option `removed` (resets to the first if the correct one is removed). */
const correctAfterRemoving = (correct: number, removed: number) => (removed < correct ? correct - 1 : removed === correct ? 0 : correct);

export function ExerciseEditor({ exercise, onChange }: { exercise: LessonExercise; onChange: (e: LessonExercise) => void }) {
  const set = (patch: Partial<LessonExercise>) => onChange({ ...exercise, ...patch });
  const t = exercise.type;
  const hasOptions = t !== 'MatchPairs' && t !== 'WordOrder';
  const optionImages = t === 'ListenPick';

  return (
    <>
      <div className="b-field">
        <label className="b-label">Instruction shown to the student</label>
        <input className="b-input" value={exercise.prompt} onChange={(e) => set({ prompt: e.target.value })} />
      </div>

      {(t === 'ListenPick' || t === 'PickTranslation' || t === 'FillBlank' || t === 'TrueFalse') && (
        <div className="b-field">
          <label className="b-label">
            {t === 'ListenPick' ? 'Italian word/sentence the student hears' : t === 'FillBlank' ? 'Sentence with ___ for the gap' : t === 'TrueFalse' ? 'Statement (in Italian)' : 'Italian text (optional)'}
          </label>
          <div className="b-row">
            <input className="b-input b-input-it" value={exercise.italian ?? ''} onChange={(e) => set({ italian: e.target.value })} />
            <ListenButton text={(exercise.italian ?? '').replace('___', '…')} />
          </div>
          {t === 'FillBlank' && !(exercise.italian ?? '').includes('___') && <div className="b-field-error">Add ___ where the missing word goes.</div>}
        </div>
      )}

      {t === 'PickWord' && <MediaField kind="image" label="Picture" value={exercise.imageUrl} onChange={(imageUrl) => set({ imageUrl })} />}

      {hasOptions && (
        <div className="b-field">
          <label className="b-label">Answers — tick the correct one</label>
          <div className="b-rows">
            {exercise.options.map((o, i) => (
              <div key={i} className={`b-option ${optionImages ? 'has-image' : ''}`}>
                <button type="button" className={`b-correct ${exercise.correctIndex === i ? 'on' : ''}`} onClick={() => set({ correctIndex: i })} title="Mark as correct" aria-label={`Answer ${i + 1} is correct`}>✓</button>
                {optionImages && <MediaField kind="image" compact value={o.imageUrl} onChange={(imageUrl) => set({ options: exercise.options.map((x, j) => (j === i ? { ...x, imageUrl } : x)) })} />}
                <input className="b-input" value={o.text} disabled={t === 'TrueFalse'}
                  onChange={(e) => set({ options: exercise.options.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })}
                  placeholder={`Answer ${i + 1}`} />
                {t !== 'TrueFalse' && exercise.options.length > 2 && (
                  <button type="button" className="b-icon-btn" title="Remove answer"
                    onClick={() => set({ options: exercise.options.filter((_, j) => j !== i), correctIndex: correctAfterRemoving(exercise.correctIndex, i) })}><Icon.X size={15} /></button>
                )}
              </div>
            ))}
          </div>
          {t !== 'TrueFalse' && exercise.options.length < 4 && (
            <button type="button" className="b-btn b-btn-sm" style={{ alignSelf: 'flex-start', marginTop: 6 }} onClick={() => set({ options: [...exercise.options, { text: '' }] })}><Icon.Plus size={15} /> Answer</button>
          )}
        </div>
      )}

      {t === 'MatchPairs' && (
        <div className="b-field">
          <label className="b-label">Pairs (Italian — English)</label>
          <div className="b-rows">
            {exercise.pairs.map((p, i) => (
              <div key={i} className="b-item b-item-pair">
                <input className="b-input b-input-it" placeholder="Italian" value={p.left} onChange={(e) => set({ pairs: exercise.pairs.map((x, j) => (j === i ? { ...x, left: e.target.value } : x)) })} />
                <input className="b-input" placeholder="English" value={p.right} onChange={(e) => set({ pairs: exercise.pairs.map((x, j) => (j === i ? { ...x, right: e.target.value } : x)) })} />
                <button type="button" className="b-icon-btn" title="Remove pair" onClick={() => set({ pairs: exercise.pairs.filter((_, j) => j !== i) })}><Icon.X size={15} /></button>
              </div>
            ))}
          </div>
          {exercise.pairs.length < 6 && (
            <button type="button" className="b-btn b-btn-sm" style={{ alignSelf: 'flex-start', marginTop: 6 }} onClick={() => set({ pairs: [...exercise.pairs, { left: '', right: '' }] })}><Icon.Plus size={15} /> Pair</button>
          )}
        </div>
      )}

      {t === 'WordOrder' && (
        <div className="b-field">
          <label className="b-label">Correct Italian sentence (the words are shuffled for the student)</label>
          <div className="b-row">
            <input className="b-input b-input-it" value={exercise.answer ?? ''} onChange={(e) => set({ answer: e.target.value })} placeholder="e.g. Mi chiamo Ahmed" />
            <ListenButton text={exercise.answer ?? ''} />
          </div>
        </div>
      )}

      <div className="b-field">
        <label className="b-label">Explanation after answering (optional)</label>
        <input className="b-input" value={exercise.explanation ?? ''} onChange={(e) => set({ explanation: e.target.value })} placeholder="e.g. With a feminine word use “una”." />
      </div>
    </>
  );
}

// ── Generate practice from the lesson's words ──────────────────────────────

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Same exercise mix as the built-in course: listen & pick, picture → word, translation, match pairs. */
export function generatePractice(words: VocabularyItem[]): LessonExercise[] {
  const valid = words.filter((w) => w.italian.trim() && w.english.trim());
  if (valid.length < 4) return [];
  const out: LessonExercise[] = [];
  const order = shuffle(valid);
  const withImg = order.filter((w) => w.imageUrl);
  const distractors = (t: VocabularyItem, needImg: boolean) =>
    shuffle(valid.filter((w) => w !== t && w.english !== t.english && (!needImg || (w.imageUrl && w.imageUrl !== t.imageUrl)))).slice(0, 3);

  withImg.slice(0, 3).forEach((t) => {
    const imgs = withImg.length >= 4;
    const choices = shuffle([t, ...distractors(t, imgs)]);
    out.push({ type: 'ListenPick', prompt: imgs ? 'Listen and choose the right picture' : 'Listen and choose the word you hear', italian: t.italian, imageUrl: null,
      options: choices.map((w) => ({ text: w.italian, imageUrl: imgs ? w.imageUrl : null })), correctIndex: choices.indexOf(t), answer: null, pairs: [], explanation: `${t.italian} = ${t.english}` });
  });
  withImg.slice(3, 5).forEach((t) => {
    const choices = shuffle([t, ...distractors(t, false)]);
    out.push({ type: 'PickWord', prompt: 'What is this in Italian?', italian: null, imageUrl: t.imageUrl, options: choices.map((w) => ({ text: w.italian })),
      correctIndex: choices.indexOf(t), answer: null, pairs: [], explanation: `${t.italian} = ${t.english}` });
  });
  order.filter((w) => !out.some((e) => e.italian === w.italian)).slice(0, 2).forEach((t) => {
    const choices = shuffle([t, ...distractors(t, false)]);
    out.push({ type: 'PickTranslation', prompt: 'What does it mean?', italian: t.italian, imageUrl: null, options: choices.map((w) => ({ text: w.english })),
      correctIndex: choices.indexOf(t), answer: null, pairs: [], explanation: null });
  });
  out.push({ type: 'MatchPairs', prompt: 'Match the Italian words with their meaning', italian: null, imageUrl: null, options: [], correctIndex: 0, answer: null,
    pairs: shuffle(valid).slice(0, 5).map((w) => ({ left: w.italian, right: w.english })), explanation: null });
  return out;
}

/** Problems that would stop the lesson from saving or confuse students. */
export function exerciseProblems(e: LessonExercise): string[] {
  const p: string[] = [];
  if (e.type === 'MatchPairs') {
    if (e.pairs.filter((x) => x.left.trim() && x.right.trim()).length < 2) p.push('needs at least 2 complete pairs');
  } else if (e.type === 'WordOrder') {
    if (!e.answer?.trim()) p.push('needs the correct sentence');
  } else {
    if (e.options.filter((o) => o.text.trim()).length < 2) p.push('needs at least 2 answers');
    if (!e.options[e.correctIndex]?.text.trim()) p.push('the correct answer is empty');
    if ((e.type === 'ListenPick' || e.type === 'TrueFalse') && !e.italian?.trim()) p.push('needs the Italian text');
    if (e.type === 'FillBlank' && !e.italian?.includes('___')) p.push('sentence needs ___');
    if (e.type === 'PickWord' && !e.imageUrl) p.push('needs a picture');
  }
  return p;
}
