import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Empty, ErrorBox, Loading, SuccessBox } from '../components/StateBlock';
import { assessmentsApi } from '../services/platformApi';
import type { Assessment, TestAttempt } from '../types';

export function AssessmentsPage() {
  const [items, setItems] = useState<Assessment[]>([]);
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setItems(await assessmentsApi.list());
        setAttempts(await assessmentsApi.myAttempts());
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load assessments');
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
          <h1>Assessments</h1>
          <p>Take quizzes and review your attempts.</p>
        </div>
      </div>
      <div className="grid-2">
        <section className="panel">
          <h2 style={{ marginBottom: '0.75rem' }}>Available tests</h2>
          {items.length === 0 ? <Empty /> : items.map((a) => (
            <div key={a.id} style={{ marginBottom: '0.85rem' }}>
              <strong>{a.title}</strong>
              <div style={{ color: 'var(--muted)' }}>{a.description}</div>
              <Link className="btn btn-primary" style={{ marginTop: '0.5rem' }} to={`/app/assessments/${a.id}`}>Start</Link>
            </div>
          ))}
        </section>
        <section className="panel">
          <h2 style={{ marginBottom: '0.75rem' }}>My attempts</h2>
          {attempts.length === 0 ? <Empty label="No attempts yet." /> : (
            <table className="table">
              <thead><tr><th>Score</th><th>Result</th><th>When</th></tr></thead>
              <tbody>
                {attempts.map((a) => (
                  <tr key={a.id}>
                    <td>{a.score}/{a.maxScore}</td>
                    <td><span className={`badge ${a.passed ? '' : 'badge-danger'}`}>{a.passed ? 'Passed' : 'Failed'}</span></td>
                    <td>{a.completedAtUtc ? new Date(a.completedAtUtc).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}

export function AssessmentTakePage() {
  const { id } = useParams();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<TestAttempt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      try {
        const data = await assessmentsApi.get(id);
        setAssessment(data);
        setAnswers(data.questions.map(() => -1));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load assessment');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    if (answers.some((a) => a < 0)) {
      setError('Please answer every question.');
      return;
    }
    setError(null);
    try {
      setResult(await assessmentsApi.submit(id, answers));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit failed');
    }
  }

  if (loading) return <Loading />;
  if (error && !assessment) return <ErrorBox message={error} />;
  if (!assessment) return <Empty />;

  return (
    <div className="animate-rise">
      <div className="page-header">
        <div>
          <h1>{assessment.title}</h1>
          <p>{assessment.description} · Pass {assessment.passingScore}% · {assessment.timeLimitMinutes} min</p>
        </div>
        <Link className="btn btn-secondary" to="/app/assessments">Back</Link>
      </div>
      {error && <ErrorBox message={error} />}
      {result && (
        <SuccessBox message={`Score ${result.score}/${result.maxScore} — ${result.passed ? 'Passed' : 'Failed'}`} />
      )}
      <form className="panel" onSubmit={onSubmit}>
        {assessment.questions.map((q, qi) => (
          <fieldset key={q.id} style={{ border: 0, margin: '0 0 1.25rem', padding: 0 }}>
            <legend style={{ fontWeight: 700, marginBottom: '0.5rem' }}>{qi + 1}. {q.prompt}</legend>
            {q.options.map((opt, oi) => (
              <label key={opt} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <input
                  type="radio"
                  name={`q-${qi}`}
                  checked={answers[qi] === oi}
                  onChange={() => setAnswers((prev) => prev.map((v, i) => (i === qi ? oi : v)))}
                />
                {opt}
              </label>
            ))}
          </fieldset>
        ))}
        <button className="btn btn-primary" type="submit" disabled={!!result}>Submit answers</button>
      </form>
    </div>
  );
}
