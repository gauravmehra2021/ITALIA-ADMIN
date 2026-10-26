import { useEffect, useState } from 'react';
import { Empty, ErrorBox, Loading } from '../components/StateBlock';
import { progressApi } from '../services/platformApi';
import type { Progress } from '../types';

export function ProgressPage() {
  const [items, setItems] = useState<Progress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setItems(await progressApi.mine());
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load progress');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} />;

  return (
    <div className="animate-rise">
      <div className="page-header">
        <div>
          <h1>Learning progress</h1>
          <p>Completion, streaks, and skill scores from your enrolled courses.</p>
        </div>
      </div>
      {items.length === 0 ? (
        <Empty label="No progress records yet." />
      ) : (
        <div className="grid-2">
          {items.map((p) => (
            <article key={p.id} className="panel">
              <h2 style={{ fontSize: '1.2rem' }}>{p.courseTitle}</h2>
              <div style={{ margin: '0.75rem 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Completion</span>
                  <strong>{p.completionPercent}%</strong>
                </div>
                <div style={{ height: 10, borderRadius: 999, background: 'var(--sand)', overflow: 'hidden', marginTop: 6 }}>
                  <div style={{ width: `${p.completionPercent}%`, height: '100%', background: 'linear-gradient(90deg, var(--azure), var(--azure-bright))' }} />
                </div>
              </div>
              <div className="grid-3">
                <div className="stat"><span>Streak</span><strong style={{ fontSize: '1.3rem' }}>{p.streakDays}d</strong></div>
                <div className="stat"><span>Grammar</span><strong style={{ fontSize: '1.3rem' }}>{p.grammarScore}</strong></div>
                <div className="stat"><span>Speaking</span><strong style={{ fontSize: '1.3rem' }}>{p.speakingScore}</strong></div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
