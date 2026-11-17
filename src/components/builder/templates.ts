import type { LessonBlock, LessonKind, SaveLessonRequest } from '../../types';

export const emptyBlock = (type: LessonBlock['type'], extra: Partial<LessonBlock> = {}): LessonBlock => ({
  type,
  title: null,
  body: null,
  mediaUrl: null,
  caption: null,
  items: [],
  lines: [],
  table: [],
  ...extra,
});

export const emptyWord = () => ({ italian: '', english: '', pronunciation: '', imageUrl: null, audioUrl: null, example: '', exampleEnglish: '' });

/** Starting structure for a new lesson of each kind (same structure as the built-in A1 course). */
export function lessonTemplate(kind: LessonKind, title: string): SaveLessonRequest {
  const base = { title, titleIt: '', kind, summary: '', status: 'Draft' as const, isFreePreview: false, exercises: [], homework: '' };
  switch (kind) {
    case 'Vocabulary':
      return { ...base, estimatedMinutes: 10, xpReward: 20, blocks: [
        emptyBlock('Text', { body: 'Tap each card to hear the word. Repeat it out loud.' }),
        emptyBlock('Vocabulary', { title: 'New words', items: [emptyWord()] }),
        emptyBlock('Tip', { title: 'Good to know' }),
      ] };
    case 'Dialogue':
      return { ...base, estimatedMinutes: 12, xpReward: 25, blocks: [
        emptyBlock('Text', { title: 'The situation' }),
        emptyBlock('Dialogue', { title: 'Dialogue', lines: [{ speaker: '', italian: '', english: '' }, { speaker: '', italian: '', english: '' }] }),
        emptyBlock('Vocabulary', { title: 'Key phrases', items: [emptyWord()] }),
        emptyBlock('Tip', { title: 'Good to know' }),
      ] };
    case 'Grammar':
      return { ...base, estimatedMinutes: 15, xpReward: 25, blocks: [
        emptyBlock('Text', { title: 'Grammar' }),
        emptyBlock('Table', { table: [['Person', 'Verb', 'English'], ['io', '', ''], ['tu', '', '']] }),
        emptyBlock('Vocabulary', { title: 'Examples', items: [emptyWord()] }),
        emptyBlock('Tip', { title: 'Good to know' }),
      ] };
    case 'Review':
      return { ...base, estimatedMinutes: 15, xpReward: 40, blocks: [
        emptyBlock('Text', { title: 'What you can do now' }),
        emptyBlock('Text', { title: 'Read', body: '', caption: '' }),
        emptyBlock('Pdf', { title: 'Unit study sheet (PDF)' }),
      ] };
    case 'Video':
      return { ...base, estimatedMinutes: 10, xpReward: 20, blocks: [
        emptyBlock('Video', { title: 'Watch' }),
        emptyBlock('Text', { title: 'Notes' }),
      ] };
    default:
      return { ...base, estimatedMinutes: 20, xpReward: 50, blocks: [emptyBlock('Text', { title: 'Instructions' })] };
  }
}
