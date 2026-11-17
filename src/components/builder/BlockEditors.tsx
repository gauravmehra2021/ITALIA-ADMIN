import { Icon } from '../Icons';
import type { LessonBlock, VocabularyItem } from '../../types';
import { ListenButton, MediaField } from './BuilderKit';
import { emptyWord } from './templates';

export const BLOCK_LABELS: Record<LessonBlock['type'], { label: string; emoji: string; help: string }> = {
  Text: { label: 'Text / explanation', emoji: '📝', help: 'Use **bold**, *italic* and lines starting with "- " for lists. Add an English translation to turn it into a reading text.' },
  Vocabulary: { label: 'Words & phrases', emoji: '📸', help: 'Words with a picture show as flip cards; without pictures they show as a phrase list. Every item plays Italian audio.' },
  Dialogue: { label: 'Dialogue', emoji: '💬', help: 'A conversation. Students can play each line or the whole dialogue.' },
  Table: { label: 'Grammar table', emoji: '📊', help: 'The first row is the header.' },
  Tip: { label: 'Culture / tip box', emoji: '💡', help: 'A short "good to know" note.' },
  Video: { label: 'Video', emoji: '🎬', help: 'Upload an MP4 or paste a YouTube / Vimeo link.' },
  Audio: { label: 'Audio', emoji: '🎧', help: 'A recorded listening (MP3).' },
  Image: { label: 'Image', emoji: '🖼️', help: 'A picture with a caption.' },
  Pdf: { label: 'PDF download', emoji: '📄', help: 'A worksheet or study sheet students can download.' },
};

type Props = { block: LessonBlock; onChange: (b: LessonBlock) => void };

export function BlockEditor({ block, onChange }: Props) {
  const set = (patch: Partial<LessonBlock>) => onChange({ ...block, ...patch });
  switch (block.type) {
    case 'Vocabulary':
      return <VocabularyEditor block={block} onChange={onChange} />;
    case 'Dialogue':
      return <DialogueEditor block={block} onChange={onChange} />;
    case 'Table':
      return <TableEditor block={block} onChange={onChange} />;
    case 'Video':
    case 'Audio':
    case 'Image':
    case 'Pdf':
      return (
        <>
          <TitleField block={block} set={set} />
          <MediaField kind={block.type === 'Pdf' ? 'pdf' : block.type === 'Image' ? 'image' : block.type === 'Video' ? 'video' : 'audio'} value={block.mediaUrl} onChange={(mediaUrl) => set({ mediaUrl })} />
          <div className="b-field">
            <label className="b-label">{block.type === 'Pdf' ? 'Short description' : 'Caption'}</label>
            <input className="b-input" value={(block.type === 'Pdf' ? block.body : block.caption) ?? ''}
              onChange={(e) => set(block.type === 'Pdf' ? { body: e.target.value } : { caption: e.target.value })} />
          </div>
        </>
      );
    default:
      return (
        <>
          <TitleField block={block} set={set} />
          <div className="b-field">
            <label className="b-label">{block.type === 'Tip' ? 'Tip' : block.caption !== null && block.caption !== undefined ? 'Text in Italian' : 'Text'}</label>
            <textarea className="b-textarea" rows={block.type === 'Tip' ? 3 : 6} value={block.body ?? ''} onChange={(e) => set({ body: e.target.value })} />
          </div>
          {block.type === 'Text' && (
            block.caption !== null && block.caption !== undefined ? (
              <div className="b-field">
                <label className="b-label">English translation (students can show / hide it)</label>
                <textarea className="b-textarea" rows={4} value={block.caption} onChange={(e) => set({ caption: e.target.value })} />
                <button type="button" className="b-btn b-btn-sm b-btn-ghost" style={{ alignSelf: 'flex-start', marginTop: 4 }} onClick={() => set({ caption: null })}>Remove translation</button>
              </div>
            ) : (
              <button type="button" className="b-btn b-btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => set({ caption: '' })}><Icon.Plus size={15} /> Add English translation (reading text)</button>
            )
          )}
        </>
      );
  }
}

function TitleField({ block, set }: { block: LessonBlock; set: (p: Partial<LessonBlock>) => void }) {
  return (
    <div className="b-field">
      <label className="b-label">Heading (optional)</label>
      <input className="b-input" value={block.title ?? ''} onChange={(e) => set({ title: e.target.value })} />
    </div>
  );
}

function VocabularyEditor({ block, onChange }: Props) {
  const items = block.items;
  const setItem = (i: number, patch: Partial<VocabularyItem>) => onChange({ ...block, items: items.map((it, j) => (j === i ? { ...it, ...patch } : it)) });
  const remove = (i: number) => onChange({ ...block, items: items.filter((_, j) => j !== i) });
  const move = (i: number, d: number) => {
    const next = [...items];
    const t = i + d;
    if (t < 0 || t >= next.length) return;
    [next[i], next[t]] = [next[t], next[i]];
    onChange({ ...block, items: next });
  };

  return (
    <>
      <TitleField block={block} set={(p) => onChange({ ...block, ...p })} />
      <div className="b-rows">
        {items.map((it, i) => (
          <div key={i} className="b-item b-item-vocab">
            <MediaField kind="image" compact value={it.imageUrl} onChange={(imageUrl) => setItem(i, { imageUrl })} />
            <div className="b-row">
              <input className="b-input b-input-it" placeholder="Italian, e.g. la mela" value={it.italian} onChange={(e) => setItem(i, { italian: e.target.value })} />
              <ListenButton text={it.italian} />
            </div>
            <input className="b-input" placeholder="English, e.g. apple" value={it.english} onChange={(e) => setItem(i, { english: e.target.value })} />
            <input className="b-input b-pron" placeholder="Say it: lah MEH-lah" value={it.pronunciation ?? ''} onChange={(e) => setItem(i, { pronunciation: e.target.value })} />
            <div className="b-row" style={{ gap: 4 }}>
              <button type="button" className="b-icon-btn" title="Move up" disabled={i === 0} onClick={() => move(i, -1)}><Icon.ArrowUp size={15} /></button>
              <button type="button" className="b-icon-btn" title="Move down" disabled={i === items.length - 1} onClick={() => move(i, 1)}><Icon.ArrowDown size={15} /></button>
              <button type="button" className="b-icon-btn" title="Remove" onClick={() => remove(i)}><Icon.X size={15} /></button>
            </div>
            <div className="b-item-vocab-extra">
              <input className="b-input" placeholder="Example in Italian (optional)" value={it.example ?? ''} onChange={(e) => setItem(i, { example: e.target.value })} />
              <input className="b-input" placeholder="Example in English" value={it.exampleEnglish ?? ''} onChange={(e) => setItem(i, { exampleEnglish: e.target.value })} />
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="b-btn b-btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => onChange({ ...block, items: [...items, emptyWord()] })}><Icon.Plus size={15} /> Add word</button>
    </>
  );
}

function DialogueEditor({ block, onChange }: Props) {
  const lines = block.lines;
  const setLine = (i: number, patch: Partial<LessonBlock['lines'][number]>) => onChange({ ...block, lines: lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) });
  return (
    <>
      <TitleField block={block} set={(p) => onChange({ ...block, ...p })} />
      <div className="b-rows">
        {lines.map((l, i) => (
          <div key={i} className="b-item b-item-line">
            <input className="b-input" placeholder="Speaker" value={l.speaker} onChange={(e) => setLine(i, { speaker: e.target.value })} />
            <div className="b-row">
              <input className="b-input b-input-it" placeholder="Italian line" value={l.italian} onChange={(e) => setLine(i, { italian: e.target.value })} />
              <ListenButton text={l.italian} />
            </div>
            <input className="b-input" placeholder="English translation" value={l.english} onChange={(e) => setLine(i, { english: e.target.value })} />
            <button type="button" className="b-icon-btn" title="Remove line" onClick={() => onChange({ ...block, lines: lines.filter((_, j) => j !== i) })}><Icon.X size={15} /></button>
          </div>
        ))}
      </div>
      <button type="button" className="b-btn b-btn-sm" style={{ alignSelf: 'flex-start' }}
        onClick={() => onChange({ ...block, lines: [...lines, { speaker: lines.length >= 2 ? lines[lines.length - 2].speaker : '', italian: '', english: '' }] })}>
        <Icon.Plus size={15} /> Add line
      </button>
    </>
  );
}

function TableEditor({ block, onChange }: Props) {
  const table = block.table.length ? block.table : [['', ''], ['', '']];
  const cols = Math.max(...table.map((r) => r.length));
  const setCell = (r: number, c: number, v: string) =>
    onChange({ ...block, table: table.map((row, i) => (i === r ? Array.from({ length: cols }, (_, j) => (j === c ? v : row[j] ?? '')) : row)) });
  return (
    <>
      <TitleField block={block} set={(p) => onChange({ ...block, ...p })} />
      <div className="b-table-edit">
        <table>
          <tbody>
            {table.map((row, r) => (
              <tr key={r}>
                {Array.from({ length: cols }, (_, c) => (
                  <td key={c}><input className="b-input" value={row[c] ?? ''} onChange={(e) => setCell(r, c, e.target.value)} placeholder={r === 0 ? 'Header' : ''} /></td>
                ))}
                <td>{r > 0 && <button type="button" className="b-icon-btn" title="Remove row" onClick={() => onChange({ ...block, table: table.filter((_, i) => i !== r) })}><Icon.X size={15} /></button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="b-row">
        <button type="button" className="b-btn b-btn-sm" onClick={() => onChange({ ...block, table: [...table, Array(cols).fill('')] })}><Icon.Plus size={15} /> Row</button>
        <button type="button" className="b-btn b-btn-sm" onClick={() => onChange({ ...block, table: table.map((r) => [...r, '']) })}><Icon.Plus size={15} /> Column</button>
        {cols > 1 && <button type="button" className="b-btn b-btn-sm b-btn-ghost" onClick={() => onChange({ ...block, table: table.map((r) => r.slice(0, cols - 1)) })}>− Column</button>}
      </div>
    </>
  );
}
