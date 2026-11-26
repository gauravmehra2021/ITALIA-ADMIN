import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../components/Icons';
import { Alert, EmptyState, PageHeader, Spinner, StatCard } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { coursesApi, translationsApi } from '../services/platformApi';
import type { Course, TranslationItem, TranslationPage } from '../types';
import './translations.css';

type LangKey = 'punjabi' | 'hindi' | 'urdu';
type Missing = '' | 'any' | LangKey;
type CountKey = 'translatedPunjabi' | 'translatedHindi' | 'translatedUrdu';

/** The languages translated on this page, in column order. */
const LANGS: { key: LangKey; label: string; head: string; placeholder: string; htmlLang?: string; dir?: 'rtl'; count: CountKey; tone: 'green' | 'orange' | 'purple' }[] = [
  { key: 'punjabi', label: 'Punjabi', head: 'Punjabi (Roman letters)', placeholder: 'Punjabi…', count: 'translatedPunjabi', tone: 'green' },
  { key: 'hindi', label: 'Hindi', head: 'Hindi (हिंदी)', placeholder: 'हिंदी…', htmlLang: 'hi', count: 'translatedHindi', tone: 'orange' },
  { key: 'urdu', label: 'Urdu', head: 'Urdu (اردو)', placeholder: 'اردو…', htmlLang: 'ur', dir: 'rtl', count: 'translatedUrdu', tone: 'purple' },
];

const FILTERS: { id: Missing; label: string }[] = [
  { id: '', label: 'All texts' },
  { id: 'any', label: 'Missing a language' },
  ...LANGS.map((l) => ({ id: l.key, label: `Missing ${l.label}` })),
];

const PAGE_SIZE = 30;

/**
 * Punjabi, Hindi and Urdu translations of the lesson content. Every English text that students
 * see (course, chapter and lesson titles, explanations, tips, homework, meanings, questions)
 * is listed once; the translation shows in small letters under it in the student app.
 */
export function TranslationsPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState('');
  const [missing, setMissing] = useState<Missing>('any');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<TranslationPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    coursesApi.list({ pageSize: 100 })
      .then((res) => {
        const list = res.items.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.title.localeCompare(b.title));
        setCourses(list);
        if (list[0]) setCourseId(list[0].id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load courses.'));
  }, []);

  // Search after the user stops typing.
  useEffect(() => {
    const id = window.setTimeout(() => { setQuery(search.trim()); setPage(1); }, 350);
    return () => window.clearTimeout(id);
  }, [search]);

  const load = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    setError(null);
    try {
      setData(await translationsApi.list({ courseId, missing: missing || undefined, search: query || undefined, page, pageSize: PAGE_SIZE }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the translations.');
    } finally {
      setLoading(false);
    }
  }, [courseId, missing, query, page]);

  useEffect(() => { void load(); }, [load]);

  const total = data?.totalTexts ?? 0;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  const pages = data?.page.totalPages ?? 0;

  function onSaved(item: TranslationItem, before: TranslationItem) {
    setData((d) => {
      if (!d) return d;
      const had = (s?: string | null) => Boolean(s?.trim());
      const next: TranslationPage = { ...d, page: { ...d.page, items: d.page.items.map((r) => (r.source === item.source ? item : r)) } };
      for (const l of LANGS) next[l.count] = (d[l.count] ?? 0) + (had(item[l.key]) ? 1 : 0) - (had(before[l.key]) ? 1 : 0);
      return next;
    });
  }

  return (
    <div className="page">
      <PageHeader
        title="Translations"
        subtitle="Punjabi, Hindi and Urdu for the lesson content. Students who choose one of these languages see your translation in small letters under the English text. Italian is never translated."
      />

      {error && <Alert tone="error" onClose={() => setError(null)}>{error}</Alert>}

      <div className="stats">
        <StatCard icon="Book" tone="blue" label="Texts in this course" value={total} />
        {LANGS.map((l) => (
          <StatCard key={l.key} icon="Globe" tone={l.tone} label={l.label} value={`${pct(data?.[l.count] ?? 0)}%`} hint={`${data?.[l.count] ?? 0} of ${total} translated`} />
        ))}
      </div>

      <div className="toolbar tr-toolbar">
        <select className="select tr-course" value={courseId} onChange={(e) => { setCourseId(e.target.value); setPage(1); }} aria-label="Course">
          {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
        <div className="chips">
          {FILTERS.map((f) => (
            <button key={f.id || 'all'} type="button" className={`chip ${missing === f.id ? 'active' : ''}`} onClick={() => { setMissing(f.id); setPage(1); }}>
              {f.label}
            </button>
          ))}
        </div>
        <label className="search">
          <Icon.Search size={17} />
          <input className="input" type="search" placeholder="Search English, Punjabi, Hindi or Urdu…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
      </div>

      <Alert tone="info">
        Write <strong>Punjabi in Roman letters</strong> (e.g. <em>Sat Sri Akal, dhanvaad</em>), <strong>Hindi in Devanagari</strong> (हिंदी) and <strong>Urdu in Urdu script</strong> (اردو, e.g. <em>السلام علیکم، شکریہ</em>). A text used in many lessons is translated once. Leave a box empty to show only the English.
      </Alert>

      {loading && !data ? (
        <Spinner label="Loading texts…" />
      ) : !data || data.page.items.length === 0 ? (
        <section className="card">
          <EmptyState
            icon="CheckCircle"
            title={missing ? 'Nothing left to translate here' : 'No texts found'}
            text={missing ? 'Every text matching this filter has a translation.' : 'Try another course or search word.'}
          />
        </section>
      ) : (
        <section className={`card tr-list ${loading ? 'is-loading' : ''}`}>
          <div className="tr-row tr-head" aria-hidden>
            <span>English (as students see it)</span>
            {LANGS.map((l) => <span key={l.key}>{l.head}</span>)}
            <span />
          </div>
          {data.page.items.map((item) => <Row key={item.source} item={item} onSaved={onSaved} onError={setError} />)}
          <div className="tr-pager">
            <span className="muted">{data.page.totalCount} texts · page {data.page.page} of {Math.max(1, pages)}</span>
            <div className="row">
              <button className="btn btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><Icon.ChevronLeft size={16} /> Previous</button>
              <button className="btn btn-sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next <Icon.ChevronRight size={16} /></button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

type Values = Record<LangKey, string>;
const valuesOf = (item: TranslationItem): Values => ({ punjabi: item.punjabi ?? '', hindi: item.hindi ?? '', urdu: item.urdu ?? '' });

function Row({ item, onSaved, onError }: { item: TranslationItem; onSaved: (item: TranslationItem, before: TranslationItem) => void; onError: (m: string) => void }) {
  const canEdit = useAuth().can('translations', 'Full');
  const [values, setValues] = useState<Values>(() => valuesOf(item));
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saved = useRef(item);

  useEffect(() => {
    saved.current = item;
    setValues(valuesOf(item));
  }, [item]);

  const dirty = LANGS.some((l) => values[l.key].trim() !== (saved.current[l.key] ?? '').trim());
  const long = item.source.length > 90 || item.source.includes('\n');
  const rows = useMemo(() => Math.min(8, Math.max(2, Math.ceil(item.source.length / 60) + (item.source.match(/\n/g)?.length ?? 0))), [item.source]);

  async function save() {
    if (!dirty) return;
    setState('saving');
    try {
      const result = await translationsApi.save({ source: item.source, ...values });
      const before = saved.current;
      saved.current = result;
      onSaved(result, before);
      setState('saved');
      window.setTimeout(() => setState('idle'), 1800);
    } catch (e) {
      setState('idle');
      onError(e instanceof Error ? e.message : 'Could not save the translation.');
    }
  }

  const onKey = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); void save(); }
  };

  return (
    <div className={`tr-row ${dirty ? 'dirty' : ''}`}>
      <div className="tr-source" title={item.source}>{item.source}</div>
      {LANGS.map((l) => {
        const props = {
          value: values[l.key],
          onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValues((v) => ({ ...v, [l.key]: e.target.value })),
          placeholder: l.placeholder,
          lang: l.htmlLang,
          dir: l.dir,
          'aria-label': `${l.label} for: ${item.source.slice(0, 60)}`,
        };
        return long
          ? <textarea key={l.key} className="textarea tr-input" rows={rows} onKeyDown={onKey} {...props} />
          : <input key={l.key} className="input tr-input" onKeyDown={(e) => { if (e.key === 'Enter') void save(); }} {...props} />;
      })}
      <div className="tr-actions">
        {state === 'saved' ? (
          <span className="tr-saved"><Icon.Check size={16} /> Saved</span>
        ) : (
          <button className="btn btn-sm btn-primary" disabled={!canEdit || !dirty || state === 'saving'} title={canEdit ? undefined : 'View only'} onClick={() => void save()}>
            {state === 'saving' ? 'Saving…' : 'Save'}
          </button>
        )}
      </div>
    </div>
  );
}
