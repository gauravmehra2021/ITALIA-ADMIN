import { useEffect, useState, useMemo } from 'react';
import { Empty, ErrorBox, Loading, SuccessBox } from '../components/StateBlock';
import { useAuth } from '../hooks/useAuth';
import { enquiriesApi } from '../services/platformApi';
import type { Enquiry, EnquiryStatus } from '../types';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  New: { label: 'New Lead', color: '#0369a1', bg: 'rgba(2, 132, 199, 0.12)', border: 'rgba(2, 132, 199, 0.3)' },
  Contacted: { label: 'Contacted', color: '#b45309', bg: 'rgba(217, 119, 6, 0.12)', border: 'rgba(217, 119, 6, 0.3)' },
  Qualified: { label: 'Qualified', color: '#7e22ce', bg: 'rgba(147, 51, 234, 0.12)', border: 'rgba(147, 51, 234, 0.3)' },
  Enrolled: { label: 'Enrolled', color: '#15803d', bg: 'rgba(22, 163, 74, 0.12)', border: 'rgba(22, 163, 74, 0.3)' },
  Closed: { label: 'Closed', color: '#475569', bg: 'rgba(100, 116, 139, 0.12)', border: 'rgba(100, 116, 139, 0.3)' },
};

function getStatusKey(status: EnquiryStatus | number): string {
  if (typeof status === 'string') return status;
  const map: Record<number, string> = { 0: 'New', 1: 'Contacted', 2: 'Qualified', 3: 'Enrolled', 4: 'Closed' };
  return map[status] ?? 'New';
}

export function EnquiriesPage() {
  const { user } = useAuth();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Filtering
  const [statusFilter, setStatusFilter] = useState<'All' | EnquiryStatus>('All');
  const [search, setSearch] = useState('');

  // Selected lead for detail/modal
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);
  const [newStatus, setNewStatus] = useState<EnquiryStatus>('New');
  const [staffNotes, setStaffNotes] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);

  const loadEnquiries = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await enquiriesApi.list();
      setEnquiries(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load enquiries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEnquiries();
  }, []);

  const openManageModal = (item: Enquiry) => {
    setSelectedEnquiry(item);
    setNewStatus(getStatusKey(item.status) as EnquiryStatus);
    setStaffNotes(item.staffNotes || '');
    setFeedback(null);
  };

  const closeManageModal = () => {
    setSelectedEnquiry(null);
  };

  const handleUpdateStatus = async (statusOverride?: EnquiryStatus) => {
    if (!selectedEnquiry) return;
    const targetStatus = statusOverride ?? newStatus;
    setSavingStatus(true);
    setError(null);
    try {
      const updated = await enquiriesApi.updateStatus(selectedEnquiry.id, {
        status: targetStatus,
        staffNotes,
      });
      // Update local state
      setEnquiries((prev) =>
        prev.map((e) => (e.id === selectedEnquiry.id ? { ...e, ...updated } : e))
      );
      setSelectedEnquiry(updated);
      setNewStatus(getStatusKey(updated.status) as EnquiryStatus);
      setFeedback(`Status updated to "${targetStatus}" with staff notes saved.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update enquiry status');
    } finally {
      setSavingStatus(false);
    }
  };

  // Metrics
  const metrics = useMemo(() => {
    const total = enquiries.length;
    const newCount = enquiries.filter((e) => getStatusKey(e.status) === 'New').length;
    const contacted = enquiries.filter((e) => getStatusKey(e.status) === 'Contacted').length;
    const qualified = enquiries.filter((e) => getStatusKey(e.status) === 'Qualified').length;
    const enrolled = enquiries.filter((e) => getStatusKey(e.status) === 'Enrolled').length;
    const closed = enquiries.filter((e) => getStatusKey(e.status) === 'Closed').length;
    const conversionRate = total > 0 ? Math.round((enrolled / total) * 100) : 0;
    return { total, newCount, contacted, qualified, enrolled, closed, conversionRate };
  }, [enquiries]);

  // Filtered list
  const filteredEnquiries = useMemo(() => {
    return enquiries.filter((e) => {
      const statusKey = getStatusKey(e.status);
      if (statusFilter !== 'All' && statusKey !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = e.fullName.toLowerCase().includes(q);
        const matchEmail = e.email.toLowerCase().includes(q);
        const matchPhone = e.phone.toLowerCase().includes(q);
        const matchCourse = e.interestedCourse.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchPhone && !matchCourse) return false;
      }
      return true;
    });
  }, [enquiries, statusFilter, search]);

  return (
    <div className="animate-rise" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h1 style={{ margin: 0 }}>Admissions & Leads Desk</h1>
            <span
              style={{
                background: 'rgba(31, 126, 168, 0.12)',
                color: 'var(--azure)',
                padding: '0.2rem 0.6rem',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 700,
              }}
            >
              CRM Support
            </span>
          </div>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--muted)' }}>
            Review incoming public website enquiries, follow up with candidates, and convert enquiries into enrolled students.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => void loadEnquiries()}
          disabled={loading}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
        >
          🔄 Refresh
        </button>
      </div>

      {feedback && <SuccessBox message={feedback} />}
      {error && <ErrorBox message={error} />}

      {/* KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        <div className="stat">
          <span>Total Inquiries</span>
          <strong>{metrics.total}</strong>
        </div>
        <div
          className="stat"
          style={{
            borderLeft: '4px solid #0284c7',
            background: 'linear-gradient(165deg, rgba(2, 132, 199, 0.06), rgba(255, 255, 255, 0.9))',
          }}
        >
          <span style={{ color: '#0369a1', fontWeight: 600 }}>New (Uncontacted)</span>
          <strong style={{ color: '#0369a1' }}>{metrics.newCount}</strong>
        </div>
        <div
          className="stat"
          style={{
            borderLeft: '4px solid #d97706',
            background: 'linear-gradient(165deg, rgba(217, 119, 6, 0.06), rgba(255, 255, 255, 0.9))',
          }}
        >
          <span style={{ color: '#b45309', fontWeight: 600 }}>In Follow-Up</span>
          <strong style={{ color: '#b45309' }}>{metrics.contacted}</strong>
        </div>
        <div
          className="stat"
          style={{
            borderLeft: '4px solid #9333ea',
            background: 'linear-gradient(165deg, rgba(147, 51, 234, 0.06), rgba(255, 255, 255, 0.9))',
          }}
        >
          <span style={{ color: '#7e22ce', fontWeight: 600 }}>Qualified Leads</span>
          <strong style={{ color: '#7e22ce' }}>{metrics.qualified}</strong>
        </div>
        <div
          className="stat"
          style={{
            borderLeft: '4px solid #16a34a',
            background: 'linear-gradient(165deg, rgba(22, 163, 74, 0.06), rgba(255, 255, 255, 0.9))',
          }}
        >
          <span style={{ color: '#15803d', fontWeight: 600 }}>Enrolled ({metrics.conversionRate}%)</span>
          <strong style={{ color: '#15803d' }}>{metrics.enrolled}</strong>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="panel"
        style={{
          padding: '1rem 1.25rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {(['All', 'New', 'Contacted', 'Qualified', 'Enrolled', 'Closed'] as const).map((st) => {
            const isActive = statusFilter === st;
            let count = metrics.total;
            if (st === 'New') count = metrics.newCount;
            if (st === 'Contacted') count = metrics.contacted;
            if (st === 'Qualified') count = metrics.qualified;
            if (st === 'Enrolled') count = metrics.enrolled;
            if (st === 'Closed') count = metrics.closed;

            return (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '0.42rem 0.85rem',
                  borderRadius: '8px',
                  border: isActive ? '1px solid var(--azure)' : '1px solid var(--line)',
                  background: isActive ? 'var(--azure)' : 'var(--paper)',
                  color: isActive ? '#ffffff' : 'var(--ink)',
                  fontSize: '0.86rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{st}</span>
                <span
                  style={{
                    background: isActive ? 'rgba(255, 255, 255, 0.25)' : 'rgba(11, 31, 51, 0.08)',
                    borderRadius: '10px',
                    padding: '0.1rem 0.45rem',
                    fontSize: '0.74rem',
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div style={{ minWidth: '240px', flex: '1 1 240px', maxWidth: '360px' }}>
          <input
            type="search"
            placeholder="Search candidate, email, course..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid var(--line)',
              background: 'var(--paper)',
              fontSize: '0.9rem',
            }}
          />
        </div>
      </div>

      {/* Main Table / List */}
      <div className="panel" style={{ padding: '0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '2rem' }}>
            <Loading label="Loading incoming enquiries…" />
          </div>
        ) : filteredEnquiries.length === 0 ? (
          <div style={{ padding: '2.5rem' }}>
            <Empty label={search || statusFilter !== 'All' ? 'No enquiries match your filter.' : 'No website enquiries received yet.'} />
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ margin: 0 }}>
              <thead>
                <tr style={{ background: 'rgba(11, 31, 51, 0.03)' }}>
                  <th style={{ paddingLeft: '1.25rem' }}>Candidate</th>
                  <th>Contact Info</th>
                  <th>Course Interest</th>
                  <th>Status</th>
                  <th>Assigned Staff</th>
                  <th>Staff Follow-up Notes</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right', paddingRight: '1.25rem' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredEnquiries.map((item) => {
                  const statusKey = getStatusKey(item.status);
                  const cfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.New;
                  const dateStr = new Date(item.createdAtUtc).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });

                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ paddingLeft: '1.25rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{item.fullName}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'flex', gap: '0.4rem', marginTop: '2px' }}>
                          <span style={{ background: 'rgba(11, 31, 51, 0.06)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                            {item.preferredLanguage || 'English'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.86rem' }}>
                          <a
                            href={`mailto:${item.email}`}
                            style={{ color: 'var(--azure)', textDecoration: 'none', display: 'block' }}
                          >
                            ✉️ {item.email}
                          </a>
                          <a
                            href={`tel:${item.phone}`}
                            style={{ color: 'var(--ink-soft)', textDecoration: 'none', display: 'block', marginTop: '2px' }}
                          >
                            📞 {item.phone}
                          </a>
                        </div>
                      </td>
                      <td>
                        <strong style={{ fontSize: '0.88rem', color: 'var(--ink)' }}>
                          {item.interestedCourse}
                        </strong>
                      </td>
                      <td>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0.22rem 0.65rem',
                            borderRadius: '999px',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            color: cfg.color,
                            backgroundColor: cfg.bg,
                            border: `1px solid ${cfg.border}`,
                          }}
                        >
                          {cfg.label}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem', color: item.assignedStaffName ? 'var(--ink)' : 'var(--muted)' }}>
                          {item.assignedStaffName ? `👤 ${item.assignedStaffName}` : '— Unassigned —'}
                        </div>
                      </td>
                      <td style={{ maxWidth: '240px' }}>
                        {item.staffNotes ? (
                          <div
                            style={{
                              fontSize: '0.82rem',
                              color: 'var(--ink-soft)',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              lineHeight: 1.4,
                            }}
                            title={item.staffNotes}
                          >
                            💬 {item.staffNotes}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontStyle: 'italic' }}>
                            No notes logged
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                        {dateStr}
                      </td>
                      <td style={{ textAlign: 'right', paddingRight: '1.25rem', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.82rem' }}
                          onClick={() => openManageModal(item)}
                        >
                          Manage Lead →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Lead Management Modal Drawer */}
      {selectedEnquiry && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(6, 18, 32, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeManageModal();
          }}
        >
          <div
            className="animate-rise"
            style={{
              background: 'var(--paper)',
              borderRadius: '16px',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 24px 64px rgba(11, 31, 51, 0.28)',
              border: '1px solid var(--line)',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    fontWeight: 700,
                    color: 'var(--azure)',
                  }}
                >
                  Candidate Profile & Lead Conversion
                </span>
                <h2 style={{ margin: '0.2rem 0 0', fontSize: '1.5rem', color: 'var(--ink)' }}>
                  {selectedEnquiry.fullName}
                </h2>
                <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '2px' }}>
                  Submitted on {new Date(selectedEnquiry.createdAtUtc).toLocaleString()}
                </div>
              </div>
              <button
                type="button"
                onClick={closeManageModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: 'var(--muted)',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            {/* Quick Contact & Details Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '0.85rem',
                background: 'rgba(11, 31, 51, 0.03)',
                padding: '1rem',
                borderRadius: '10px',
                border: '1px solid var(--line)',
              }}
            >
              <div>
                <small style={{ color: 'var(--muted)', display: 'block', fontSize: '0.78rem' }}>Course Interested</small>
                <strong style={{ fontSize: '0.92rem', color: 'var(--ink)' }}>{selectedEnquiry.interestedCourse}</strong>
              </div>
              <div>
                <small style={{ color: 'var(--muted)', display: 'block', fontSize: '0.78rem' }}>Preferred Language</small>
                <strong style={{ fontSize: '0.92rem', color: 'var(--ink)' }}>{selectedEnquiry.preferredLanguage || 'English'}</strong>
              </div>
              <div>
                <small style={{ color: 'var(--muted)', display: 'block', fontSize: '0.78rem' }}>Email Address</small>
                <a href={`mailto:${selectedEnquiry.email}`} style={{ color: 'var(--azure)', fontWeight: 600, fontSize: '0.92rem' }}>
                  {selectedEnquiry.email}
                </a>
              </div>
              <div>
                <small style={{ color: 'var(--muted)', display: 'block', fontSize: '0.78rem' }}>Phone / WhatsApp</small>
                <a href={`tel:${selectedEnquiry.phone}`} style={{ color: 'var(--ink-soft)', fontWeight: 600, fontSize: '0.92rem' }}>
                  {selectedEnquiry.phone}
                </a>
              </div>
            </div>

            {/* Candidate Original Message */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--ink-soft)' }}>
                Website Message from Applicant:
              </label>
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid var(--line)',
                  borderLeft: '4px solid var(--azure)',
                  padding: '0.9rem 1.1rem',
                  borderRadius: '8px',
                  fontStyle: 'italic',
                  color: 'var(--ink)',
                  fontSize: '0.94rem',
                  lineHeight: 1.55,
                }}
              >
                "{selectedEnquiry.message}"
              </div>
            </div>

            {/* Pipeline Stage Selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <label style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--ink-soft)' }}>
                Lead Pipeline Status:
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {(['New', 'Contacted', 'Qualified', 'Enrolled', 'Closed'] as const).map((st) => {
                  const isSelected = newStatus === st;
                  const cfg = STATUS_CONFIG[st];
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setNewStatus(st)}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '8px',
                        border: isSelected ? `2px solid ${cfg.color}` : '1px solid var(--line)',
                        background: isSelected ? cfg.bg : 'var(--paper)',
                        color: isSelected ? cfg.color : 'var(--muted)',
                        fontWeight: isSelected ? 700 : 500,
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {isSelected ? '● ' : '○ '}
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Staff Internal Notes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--ink-soft)' }}>
                Internal Staff Notes & Log:
              </label>
              <textarea
                rows={4}
                placeholder="Log your conversation, WhatsApp calls, student availability, fee discussions, or next steps here..."
                value={staffNotes}
                onChange={(e) => setStaffNotes(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--line)',
                  background: '#ffffff',
                  fontSize: '0.92rem',
                  lineHeight: 1.5,
                }}
              />
              <small style={{ color: 'var(--muted)' }}>
                Logged by: <strong>{user?.fullName || 'Elena Moretti (Staff)'}</strong>
              </small>
            </div>

            {/* Modal Actions */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '0.75rem',
                borderTop: '1px solid var(--line)',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {newStatus !== 'Contacted' && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.82rem', padding: '0.4rem 0.75rem' }}
                    onClick={() => void handleUpdateStatus('Contacted')}
                    disabled={savingStatus}
                  >
                    Quick: Mark Contacted
                  </button>
                )}
                {newStatus !== 'Qualified' && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.82rem', padding: '0.4rem 0.75rem' }}
                    onClick={() => void handleUpdateStatus('Qualified')}
                    disabled={savingStatus}
                  >
                    Quick: Qualify Lead
                  </button>
                )}
                {newStatus !== 'Enrolled' && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.82rem', padding: '0.4rem 0.75rem', borderColor: '#16a34a', color: '#15803d' }}
                    onClick={() => void handleUpdateStatus('Enrolled')}
                    disabled={savingStatus}
                  >
                    Quick: Mark Enrolled
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeManageModal}
                  disabled={savingStatus}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-azure"
                  onClick={() => void handleUpdateStatus()}
                  disabled={savingStatus}
                >
                  {savingStatus ? 'Saving changes…' : 'Save Lead & Notes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
