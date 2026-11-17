import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Empty, ErrorBox, Loading, SuccessBox } from '../components/StateBlock';
import { useAuth } from '../hooks/useAuth';
import { certificatesApi } from '../services/platformApi';
import type { Certificate } from '../types';

/* Notifications, Users & Roles and the Audit Log now live in their own files. */

export function CertificatesPage() {
  const [items, setItems] = useState<Certificate[]>([]);
  const [code, setCode] = useState('SSE-20261001-PRYA81');
  const [verified, setVerified] = useState<Certificate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        setItems(await certificatesApi.list());
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load certificates');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function verify(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      setVerified(await certificatesApi.verify(code));
    } catch (err) {
      setVerified(null);
      setError(err instanceof Error ? err.message : 'Verification failed');
    }
  }

  if (loading) return <Loading />;

  return (
    <div className="animate-rise">
      <div className="page-header"><div><h1>Certificates</h1><p>Issue metadata and public verification by certificate code.</p></div></div>
      {error && <ErrorBox message={error} />}
      <div className="grid-2">
        <section className="panel">
          <h2>My certificates</h2>
          {items.length === 0 ? <Empty /> : items.map((c) => (
            <article key={c.id} style={{ marginBottom: '0.85rem' }}>
              <strong>{c.courseTitle}</strong>
              <div>{c.certificateCode}</div>
              <div style={{ color: 'var(--muted)' }}>Issued {new Date(c.issuedAtUtc).toLocaleDateString()}</div>
            </article>
          ))}
        </section>
        <section className="panel">
          <h2>Verify certificate</h2>
          <form onSubmit={verify}>
            <div className="field"><label>Code</label><input value={code} onChange={(e) => setCode(e.target.value)} /></div>
            <button className="btn btn-primary" type="submit">Verify</button>
          </form>
          {verified && (
            <SuccessBox message={`Valid: ${verified.userName} — ${verified.courseTitle}`} />
          )}
        </section>
      </div>
    </div>
  );
}


export function AdminPage() {
  const { hasRole } = useAuth();
  const isSuperAdmin = hasRole('SuperAdmin');
  return (
    <div className="animate-rise">
      <div className="page-header">
        <div>
          <h1>Admin console</h1>
          <p>Operational shortcuts for courses, classes, enquiries{isSuperAdmin ? ', team and audit' : ''}.</p>
        </div>
      </div>
      <div className="grid-3">
        <Link className="panel" to="/app/enquiries"><h2>Admissions & Leads</h2><p>Review website contact enquiries and student pipeline.</p></Link>
        <Link className="panel" to="/app/courses"><h2>Courses</h2><p>Publish and manage catalogue capacity.</p></Link>
        <Link className="panel" to="/app/classes"><h2>Live Classes</h2><p>Schedule classes and share join links.</p></Link>
        {isSuperAdmin && <Link className="panel" to="/app/users"><h2>Users & Roles</h2><p>Create Admin, Staff and Teacher accounts.</p></Link>}
        {isSuperAdmin && <Link className="panel" to="/app/audit"><h2>Audit Log</h2><p>Inspect authentication and admin events.</p></Link>}
        <Link className="panel" to="/app/notifications"><h2>Notifications</h2><p>Send updates to students.</p></Link>
      </div>
    </div>
  );
}
