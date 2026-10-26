import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { Empty, ErrorBox, Loading, SuccessBox } from '../components/StateBlock';
import { aiApi } from '../services/platformApi';
import type { AiResponse } from '../types';

const MODES = [
  { id: 'tutor', label: 'AI Tutor' },
  { id: 'translator', label: 'Translator' },
  { id: 'conversation', label: 'Conversation' },
  { id: 'speaking', label: 'Speaking' },
  { id: 'practice', label: 'Personalized practice' },
];

export function AiPage() {
  const [mode, setMode] = useState('tutor');
  const [prompt, setPrompt] = useState('Explain when to use essere vs stare');
  const [history, setHistory] = useState<AiResponse[]>([]);
  const [latest, setLatest] = useState<AiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setHistory(await aiApi.history());
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load AI history');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await aiApi.ask(mode, prompt);
      setLatest(result);
      setHistory((prev) => [result, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI request failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Loading />;

  return (
    <div className="animate-rise">
      <div className="page-header">
        <div>
          <h1>AI learning layer</h1>
          <p>Mock LLM responses routed through the .NET API — no live AI credentials required.</p>
        </div>
      </div>
      {error && <ErrorBox message={error} />}
      {latest && <SuccessBox message="Mock AI response received." />}

      <form className="panel" style={{ marginBottom: '1rem' }} onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="mode">Mode</label>
          <select id="mode" value={mode} onChange={(e) => setMode(e.target.value)}>
            {MODES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="prompt">Prompt</label>
          <textarea id="prompt" rows={4} value={prompt} onChange={(e) => setPrompt(e.target.value)} required />
        </div>
        <button className="btn btn-azure" type="submit" disabled={submitting}>
          {submitting ? 'Thinking…' : 'Ask AI'}
        </button>
      </form>

      {latest && (
        <div className="panel" style={{ marginBottom: '1rem' }}>
          <h2 style={{ marginBottom: '0.5rem' }}>Latest response</h2>
          <p style={{ whiteSpace: 'pre-wrap' }}>{latest.response}</p>
          <span className="badge badge-warn">Mocked · {latest.tokensUsed} tokens</span>
        </div>
      )}

      <div className="panel">
        <h2 style={{ marginBottom: '0.75rem' }}>Session history</h2>
        {history.length === 0 ? <Empty label="No AI sessions yet." /> : (
          <div style={{ display: 'grid', gap: '0.85rem' }}>
            {history.map((h) => (
              <article key={h.sessionId}>
                <strong>{h.mode}</strong> — {h.prompt}
                <div style={{ color: 'var(--muted)', marginTop: 4 }}>{h.response}</div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
