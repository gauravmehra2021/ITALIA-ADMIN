import { Icon } from '../Icons';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { mediaUrl } from '../../services/api';
import { curriculumApi, mediaApi } from '../../services/platformApi';
import type { Illustration, LessonKind, LessonStatus } from '../../types';

export const KIND_META: Record<LessonKind, { label: string; emoji: string; color: string; bg: string; help: string }> = {
  Vocabulary: { label: 'Words', emoji: '📸', color: '#1450b8', bg: '#e3edff', help: 'New words with pictures and audio, then practice.' },
  Dialogue: { label: 'Dialogue', emoji: '💬', color: '#00894a', bg: '#dcf5e8', help: 'A real-life conversation, key phrases and comprehension.' },
  Grammar: { label: 'Grammar', emoji: '📘', color: '#7a3cc8', bg: '#efe4ff', help: 'One grammar point: explanation, table, examples, exercises.' },
  Review: { label: 'Review', emoji: '🏆', color: '#b07400', bg: '#fff4cf', help: 'Unit recap, a reading text, the PDF study sheet and a quiz.' },
  Video: { label: 'Video', emoji: '🎬', color: '#c8202e', bg: '#fde4e6', help: 'A video lesson with notes and optional questions.' },
  Exam: { label: 'Exam', emoji: '📝', color: '#0f1b33', bg: '#eef1f6', help: 'A test in the CILS style.' },
  Conversation: { label: 'Speaking practice', emoji: '🗣️', color: '#0f766e', bg: '#ccfbf1', help: 'A role-play: students listen to the other person and answer out loud (or tap / type a reply).' },
};

export function StatusBadge({ status }: { status: LessonStatus | string }) {
  const published = status === 'Published';
  return <span className={`b-badge ${published ? 'b-badge-green' : 'b-badge-gray'}`}>{published ? '● Published' : '○ Draft'}</span>;
}

export function Modal({ title, onClose, children, footer, wide = false }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return createPortal(
    <div className="b-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`b-modal ${wide ? 'b-modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="b-modal-head">
          <h2>{title}</h2>
          <button type="button" className="b-icon-btn b-danger" onClick={onClose} aria-label="Close"><Icon.X size={15} /></button>
        </header>
        <div className="b-modal-body">{children}</div>
        {footer && <footer className="b-modal-foot">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

let illustrationCache: Illustration[] | null = null;

export function IllustrationPicker({ onPick, onClose }: { onPick: (url: string) => void; onClose: () => void }) {
  const [items, setItems] = useState<Illustration[]>(illustrationCache ?? []);
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (illustrationCache) return;
    curriculumApi.illustrations()
      .then((list) => {
        illustrationCache = list;
        setItems(list);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load illustrations'));
  }, []);

  const filtered = useMemo(() => items.filter((i) => i.name.includes(q.trim().toLowerCase())), [items, q]);

  return (
    <Modal title="Choose an illustration" onClose={onClose} wide>
      <input className="b-input" autoFocus placeholder="Search: apple, bus, doctor…" value={q} onChange={(e) => setQ(e.target.value)} />
      {error && <div className="b-alert b-alert-error">{error}</div>}
      <div className="b-illus-grid">
        {filtered.map((i) => (
          <button key={i.url} type="button" className="b-illus" onClick={() => { onPick(i.url); onClose(); }} title={i.name}>
            <img src={mediaUrl(i.url) ?? undefined} alt="" loading="lazy" />
            <span>{i.name}</span>
          </button>
        ))}
        {items.length > 0 && filtered.length === 0 && <p className="b-muted">No illustration matches "{q}". You can also upload your own picture.</p>}
      </div>
      <p className="b-muted b-small">Illustrations: Microsoft Fluent Emoji (MIT licence).</p>
    </Modal>
  );
}

type MediaKind = 'image' | 'video' | 'audio' | 'pdf';

const ACCEPT: Record<MediaKind, string> = {
  image: 'image/png,image/jpeg,image/webp',
  video: 'video/mp4,video/webm',
  audio: 'audio/mpeg,audio/mp4,audio/wav,audio/ogg,audio/webm',
  pdf: 'application/pdf',
};

/** A URL field with upload (and, for images, the illustration picker). */
export function MediaField({ kind, value, onChange, label, allowLink = true, compact = false }: {
  kind: MediaKind;
  value?: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  allowLink?: boolean;
  compact?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const url = mediaUrl(value);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const res = await mediaApi.upload(file, kind === 'image' ? 'images' : kind === 'pdf' ? 'documents' : kind === 'video' ? 'videos' : 'audios');
      onChange(res.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className={`b-media ${compact ? 'b-media-compact' : ''}`}>
      {label && <label className="b-label">{label}</label>}
      <div className="b-media-row">
        {kind === 'image' && (
          <button type="button" className="b-media-thumb" onClick={() => setPicking(true)} title="Choose an illustration">
            {url ? <img src={url} alt="" /> : <Icon.Plus size={18} />}
          </button>
        )}
        {allowLink && !compact && (
          <input
            className="b-input"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value || null)}
            placeholder={kind === 'video' ? 'Upload, or paste a YouTube / Vimeo link' : kind === 'image' ? 'Pick an illustration, upload, or paste a link' : 'Upload, or paste a link'}
          />
        )}
        <div className="b-media-actions">
          {kind === 'image' && !compact && <button type="button" className="b-btn b-btn-sm" onClick={() => setPicking(true)}>Illustrations</button>}
          <button type="button" className="b-btn b-btn-sm" onClick={() => fileRef.current?.click()} disabled={busy}>{busy ? 'Uploading…' : 'Upload'}</button>
          {value && <button type="button" className="b-btn b-btn-sm b-btn-ghost" onClick={() => onChange(null)} title="Remove"><Icon.X size={15} /></button>}
        </div>
        <input ref={fileRef} type="file" hidden accept={ACCEPT[kind]} onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])} />
      </div>
      {error && <div className="b-field-error">{error}</div>}
      {picking && <IllustrationPicker onPick={(u) => onChange(u)} onClose={() => setPicking(false)} />}
    </div>
  );
}

/** Plays Italian text with the browser's Italian voice (same as the student portal). */
export function speakItalian(text: string) {
  if (!('speechSynthesis' in window) || !text) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/[–—…]/g, ' '));
  u.lang = 'it-IT';
  const v = window.speechSynthesis.getVoices().find((x) => x.lang === 'it-IT');
  if (v) u.voice = v;
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
}

export function ListenButton({ text }: { text: string }) {
  return (
    <button type="button" className="b-icon-btn b-listen" onClick={() => speakItalian(text)} title="Listen" aria-label={`Listen: ${text}`} disabled={!text}>
      🔊
    </button>
  );
}
