import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { Alert, EmptyState, Modal, PageHeader, Person, Spinner, StatCard, formatDate, timeAgo } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { ENQUIRY_META, ENQUIRY_STAGES, enquiryStatus } from '../lib/status';
import { enquiriesApi } from '../services/platformApi';
import type { Enquiry, EnquiryStatus } from '../types';
import './pages.css';

type Filter = 'All' | EnquiryStatus;

const digits = (phone: string) => phone.replace(/[^\d]/g, '');

export function EnquiriesPage() {
  const { user, can } = useAuth();
  const canEdit = can('enquiries', 'Full');
  const [params, setParams] = useSearchParams();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const initialFilter = params.get('status') as Filter | null;
  const [filter, setFilter] = useState<Filter>(initialFilter && (ENQUIRY_STAGES as string[]).includes(initialFilter) ? initialFilter : 'All');
  const [search, setSearch] = useState('');

  const [selected, setSelected] = useState<Enquiry | null>(null);
  const [stage, setStage] = useState<EnquiryStatus>('New');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const list = await enquiriesApi.list();
      list.sort((a, b) => +new Date(b.createdAtUtc) - +new Date(a.createdAtUtc));
      setEnquiries(list);
      return list;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load enquiries.');
      return [];
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load().then((list) => {
      // Opened from the dashboard: /app/enquiries?open=<id>
      const id = params.get('open');
      const hit = id && list.find((e) => e.id === id);
      if (hit) openLead(hit);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openLead(e: Enquiry) {
    setSelected(e);
    setStage(enquiryStatus(e.status));
    setNotes(e.staffNotes || '');
    setSaveError(null);
  }

  function closeLead() {
    setSelected(null);
    if (params.has('open')) {
      params.delete('open');
      setParams(params, { replace: true });
    }
  }

  async function save(next: EnquiryStatus = stage) {
    if (!selected) return;
    setSaving(true);
    setSaveError(null);
    try {
      // The server makes the current team member the owner of an unassigned lead.
      const updated = await enquiriesApi.updateStatus(selected.id, { status: next, staffNotes: notes });
      setEnquiries((list) => list.map((e) => (e.id === selected.id ? { ...e, ...updated } : e)));
      setToast(next === 'Paid' && !selected.convertedUserId
        ? `${selected.fullName} is now a student. Send their login from Students → New (paid).`
        : `${selected.fullName} saved as “${ENQUIRY_META[next].label}”.`);
      closeLead();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save this lead.');
    } finally {
      setSaving(false);
    }
  }

  const counts = useMemo(() => {
    const c = Object.fromEntries(ENQUIRY_STAGES.map((s) => [s, 0])) as Record<EnquiryStatus, number>;
    enquiries.forEach((e) => c[enquiryStatus(e.status)]++);
    return c;
  }, [enquiries]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enquiries.filter((e) => {
      if (filter !== 'All' && enquiryStatus(e.status) !== filter) return false;
      if (!q) return true;
      return [e.fullName, e.email, e.phone, e.interestedCourse, e.preferredLanguage].some((v) => v?.toLowerCase().includes(q));
    });
  }, [enquiries, filter, search]);

  const total = enquiries.length;
  const conversion = total ? Math.round((counts.Paid / total) * 100) : 0;

  return (
    <div className="page">
      <PageHeader
        title="Admissions & Leads"
        subtitle="Enquiries from the website contact form. Contact new leads quickly and keep each stage up to date."
        actions={
          <button type="button" className="btn btn-secondary" onClick={() => void load()} disabled={loading}>
            <Icon.Refresh size={17} /> Refresh
          </button>
        }
      />

      {toast && <Alert tone="success" onClose={() => setToast(null)}>{toast}</Alert>}
      {error && <Alert tone="error">{error}</Alert>}

      <div className="stats">
        <StatCard icon="Inbox" tone="blue" label="All enquiries" value={total} />
        <StatCard icon="Sparkles" tone="orange" label="New — not contacted" value={counts.New} />
        <StatCard icon="Phone" tone="purple" label="In follow-up" value={counts.Contacted + counts.Qualified} />
        <StatCard icon="CheckCircle" tone="green" label="Paid" value={counts.Paid} hint={`${conversion}% conversion · ${counts.Enrolled} enrolled, not paid yet`} />
      </div>

      <section className="card">
        <div className="card-head toolbar">
          <div className="chips" role="tablist" aria-label="Filter by stage">
            {(['All', ...ENQUIRY_STAGES] as Filter[]).map((s) => (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={filter === s}
                className={`chip ${filter === s ? 'active' : ''}`}
                onClick={() => setFilter(s)}
              >
                {s === 'All' ? 'All' : ENQUIRY_META[s].label}
                <span className="count">{s === 'All' ? total : counts[s]}</span>
              </button>
            ))}
          </div>
          <label className="search">
            <Icon.Search size={17} />
            <input className="input" type="search" placeholder="Search name, email, phone, course…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
        </div>

        {loading ? (
          <Spinner label="Loading enquiries…" />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={search || filter !== 'All' ? 'Search' : 'Inbox'}
            title={search || filter !== 'All' ? 'No enquiries match' : 'No enquiries yet'}
            text={search || filter !== 'All' ? 'Try another stage or search word.' : 'New messages from the website contact form will appear here.'}
          />
        ) : (
          <div className="table-wrap">
            <table className="table table-cards">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Contact</th>
                  <th>Interested in</th>
                  <th>Stage</th>
                  <th>Owner</th>
                  <th>Received</th>
                  <th aria-label="Open" />
                </tr>
              </thead>
              <tbody>
                {visible.map((e) => {
                  const s = enquiryStatus(e.status);
                  return (
                    <tr key={e.id} className="is-clickable" onClick={() => openLead(e)}>
                      <td data-label="Candidate">
                        <Person name={e.fullName} sub={e.preferredLanguage || 'English'} />
                      </td>
                      <td data-label="Contact">
                        <div className="contact-cell">
                          <a href={`mailto:${e.email}`} onClick={(ev) => ev.stopPropagation()} title={e.email}>{e.email}</a>
                          <a href={`tel:${e.phone}`} onClick={(ev) => ev.stopPropagation()} className="muted">{e.phone}</a>
                        </div>
                      </td>
                      <td data-label="Interested in"><span className="strong">{e.interestedCourse}</span></td>
                      <td data-label="Stage"><span className={`badge badge-dot badge-${ENQUIRY_META[s].tone}`}>{ENQUIRY_META[s].label}</span></td>
                      <td data-label="Owner">
                        {e.assignedStaffName ? <span className="small">{e.assignedStaffName}</span> : <span className="muted small">Unassigned</span>}
                      </td>
                      <td data-label="Received" className="nowrap muted small" title={formatDate(e.createdAtUtc, true)}>{timeAgo(e.createdAtUtc)}</td>
                      <td className="actions">
                        <button type="button" className="btn btn-secondary btn-sm" onClick={(ev) => { ev.stopPropagation(); openLead(e); }}>
                          Open
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        open={!!selected}
        onClose={closeLead}
        drawer
        title={selected?.fullName}
        subtitle={selected ? `Enquiry received ${formatDate(selected.createdAtUtc, true)}` : undefined}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={closeLead} disabled={saving}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={() => void save()} disabled={saving || !canEdit} title={canEdit ? undefined : 'View only'}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </>
        }
      >
        {selected && (
          <div className="lead">
            {saveError && <Alert tone="error">{saveError}</Alert>}

            <div className="lead-contact">
              <a className="btn btn-secondary" href={`tel:${selected.phone}`}><Icon.Phone size={17} /> Call</a>
              <a className="btn btn-secondary" href={`https://wa.me/${digits(selected.phone)}`} target="_blank" rel="noreferrer"><Icon.WhatsApp size={17} /> WhatsApp</a>
              <a className="btn btn-secondary" href={`mailto:${selected.email}`}><Icon.Mail size={17} /> Email</a>
            </div>

            <dl className="dl">
              <div><dt>Interested in</dt><dd>{selected.interestedCourse}</dd></div>
              <div><dt>Preferred language</dt><dd>{selected.preferredLanguage || 'English'}</dd></div>
              <div><dt>Email</dt><dd>{selected.email}</dd></div>
              <div><dt>Phone / WhatsApp</dt><dd>{selected.phone}</dd></div>
              <div><dt>Owner</dt><dd>{selected.assignedStaffName || `Unassigned — saving makes ${user?.firstName || 'you'} the owner`}</dd></div>
              <div><dt>Last updated</dt><dd>{selected.updatedAtUtc ? timeAgo(selected.updatedAtUtc) : 'Never'}</dd></div>
            </dl>

            <div>
              <div className="label">Their message</div>
              <blockquote className="lead-message">{selected.message || 'No message.'}</blockquote>
            </div>

            <div>
              <div className="label">Stage</div>
              <div className="stage-picker" role="radiogroup" aria-label="Stage">
                {ENQUIRY_STAGES.map((s, i) => (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={stage === s}
                    className={`stage tone-${ENQUIRY_META[s].tone} ${stage === s ? 'active' : ''}`}
                    onClick={() => setStage(s)}
                  >
                    <span className="stage-num">{stage === s ? <Icon.Check size={14} /> : i + 1}</span>
                    <span>
                      <strong>{ENQUIRY_META[s].label}</strong>
                      <small>{ENQUIRY_META[s].help}</small>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {selected.convertedUserId ? (
              <Alert tone="success">
                Student account made for {selected.email}. <Link to="/app/students?tab=new">Open in Students</Link> to send the login.
              </Alert>
            ) : stage === 'Paid' ? (
              <Alert tone="info">
                Saving as Paid makes a student account for {selected.email}. No email goes out yet: you send the login from Students → New (paid).
              </Alert>
            ) : null}

            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="lead-notes">Notes</label>
              <textarea
                id="lead-notes"
                rows={5}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Calls, WhatsApp messages, availability, visa situation, next step…"
              />
              <span className="hint">Only the team can see these notes.</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
