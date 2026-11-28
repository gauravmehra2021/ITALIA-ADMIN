import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, type IconName } from '../components/Icons';
import { NOTIFICATION_ICON } from '../components/NotificationBell';
import { Alert, EmptyState, Logo, Modal, PageHeader, Spinner, formatDate, timeAgo } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { adminNotificationLink, notificationTypeName, useNotifications } from '../hooks/useNotifications';
import { notificationsApi } from '../services/platformApi';
import type { AnnouncementAudience, AudienceOptions, NotificationBroadcast, Paged, UserRole } from '../types';
import './pages.css';

type AudienceChoice = 'all' | 'course' | 'batch' | 'students' | 'role:Mentor' | 'role:Staff' | 'role:Admin';

const TYPES: { type: string; label: string; icon: IconName }[] = [
  { type: 'Announcement', label: 'Announcement', icon: 'Megaphone' },
  { type: 'Class', label: 'Class', icon: 'Video' },
  { type: 'Course', label: 'Course update', icon: 'Book' },
  { type: 'Assignment', label: 'Assignment', icon: 'File' },
  { type: 'Material', label: 'Material', icon: 'Layers' },
  { type: 'Test', label: 'Test / exam', icon: 'Target' },
  { type: 'Security', label: 'Account', icon: 'Lock' },
];

const TITLE_MAX = 120;
const MESSAGE_MAX = 2000;
const HISTORY_PAGE = 8;

const newRequestId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

export function NotificationsPage() {
  const { can } = useAuth();
  const canSend = can('notifications', 'Full');
  const navigate = useNavigate();
  const inbox = useNotifications();

  const [options, setOptions] = useState<AudienceOptions | null>(null);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Compose
  const [audience, setAudience] = useState<AudienceChoice>('all');
  const [courseId, setCourseId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [studentIds, setStudentIds] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [type, setType] = useState('Announcement');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [requestId, setRequestId] = useState(newRequestId);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);

  // History
  const [history, setHistory] = useState<Paged<NotificationBroadcast> | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Inbox
  const [inboxFilter, setInboxFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    if (!canSend) return;
    notificationsApi.audience().then(setOptions).catch((e) => setOptionsError(e instanceof Error ? e.message : 'Could not load the audience.'));
  }, [canSend]);

  const loadHistory = useCallback(async (page: number) => {
    setHistoryLoading(true);
    try {
      setHistory(await notificationsApi.announcements(page, HISTORY_PAGE));
      setHistoryPage(page);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load sent announcements.');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory(1);
  }, [loadHistory]);

  // Read counts change as students open the announcement: refresh the first page now and then.
  useEffect(() => {
    if (historyPage !== 1) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') notificationsApi.announcements(1, HISTORY_PAGE).then(setHistory).catch(() => undefined);
    }, 30000);
    return () => window.clearInterval(id);
  }, [historyPage]);

  const limited = options?.limitedToOwnStudents ?? false;
  const roles = useMemo(() => options?.roles ?? [], [options]);

  const choices = useMemo(() => {
    const list: { id: AudienceChoice; label: string; help: string; icon: IconName }[] = [
      { id: 'all', label: limited ? 'All my students' : 'All students', help: limited ? 'Students of your batches and courses' : 'Everyone learning on the app and web', icon: 'Cap' },
      { id: 'course', label: 'Students of a course', help: 'Everyone who can open one course', icon: 'Book' },
      { id: 'batch', label: 'A batch', help: limited ? 'One of the batches you lead' : 'Everyone in one batch', icon: 'Layers' },
      { id: 'students', label: 'Chosen students', help: 'Pick one or more students', icon: 'Users' },
    ];
    if (roles.includes('Mentor')) list.push({ id: 'role:Mentor', label: 'Teachers', help: 'All teacher accounts', icon: 'Book' });
    if (roles.includes('Staff')) list.push({ id: 'role:Staff', label: 'Admissions staff', help: 'All staff accounts', icon: 'Inbox' });
    if (roles.includes('Admin')) list.push({ id: 'role:Admin', label: 'Admins', help: 'All admin accounts', icon: 'Shield' });
    return list;
  }, [limited, roles]);

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    const all = options?.students ?? [];
    if (!q) return all;
    return all.filter((s) => s.fullName.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || s.batchNames.some((b) => b.toLowerCase().includes(q)));
  }, [options, studentSearch]);

  /** How many people it will reach (shown before sending; the server decides the final number). */
  const estimate = useMemo<number | null>(() => {
    if (!options) return null;
    switch (audience) {
      case 'all': return options.students.length;
      case 'course': return options.courses.find((c) => c.id === courseId)?.studentCount ?? null;
      case 'batch': return options.batches.find((b) => b.id === batchId)?.studentCount ?? null;
      case 'students': return studentIds.length;
      default: return null;
    }
  }, [options, audience, courseId, batchId, studentIds]);

  const audienceLabel = useMemo(() => {
    if (audience === 'course') return options?.courses.find((c) => c.id === courseId)?.title ?? 'a course';
    if (audience === 'batch') return `batch ${options?.batches.find((b) => b.id === batchId)?.name ?? ''}`.trim();
    if (audience === 'students') return `${studentIds.length} chosen student${studentIds.length === 1 ? '' : 's'}`;
    return choices.find((c) => c.id === audience)?.label.toLowerCase() ?? '';
  }, [audience, options, courseId, batchId, studentIds, choices]);

  const missingTarget =
    (audience === 'course' && !courseId) || (audience === 'batch' && !batchId) || (audience === 'students' && studentIds.length === 0);
  const ready = canSend && !missingTarget && title.trim().length > 0 && message.trim().length > 0;

  function toggleStudent(id: string) {
    setStudentIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (ready) setConfirming(true);
  }

  async function send() {
    setSending(true);
    setError(null);
    setToast(null);
    const role = audience.startsWith('role:') ? (audience.slice(5) as UserRole) : null;
    const apiAudience: AnnouncementAudience =
      role ? 'Role' : audience === 'all' ? 'AllStudents' : audience === 'course' ? 'Course' : audience === 'batch' ? 'Batch' : 'Students';
    try {
      const res = await notificationsApi.sendAnnouncement({
        title: title.trim(),
        message: message.trim(),
        type,
        audience: apiAudience,
        courseId: apiAudience === 'Course' ? courseId : null,
        batchId: apiAudience === 'Batch' ? batchId : null,
        studentIds: apiAudience === 'Students' ? studentIds : undefined,
        targetRole: role,
        clientRequestId: requestId,
      });
      setToast(res.alreadySent
        ? 'This announcement was already sent.'
        : `Sent to ${res.sentCount} ${res.sentCount === 1 ? 'person' : 'people'} — ${res.targetDescription.toLowerCase()}. Online students see it straight away; the others when they next open the app.`);
      setTitle('');
      setMessage('');
      setStudentIds([]);
      setRequestId(newRequestId());
      setConfirming(false);
      void loadHistory(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the notification.');
      setConfirming(false);
    } finally {
      setSending(false);
    }
  }

  const inboxItems = inbox.recent.filter((n) => inboxFilter === 'all' || !n.isRead);
  const TypeIcon = Icon[TYPES.find((t) => t.type === type)?.icon ?? 'Megaphone'];

  return (
    <div className="page">
      <PageHeader
        title="Notifications"
        subtitle="Send announcements to students. They are saved for every student and appear instantly for anyone online."
      />

      {toast && <Alert tone="success" onClose={() => setToast(null)}>{toast}</Alert>}
      {error && <Alert tone="error" onClose={() => setError(null)}>{error}</Alert>}

      <div className="notify-grid">
        {canSend ? (
          <form className="card" onSubmit={onSubmit}>
            <div className="card-head">
              <div>
                <h2>New notification</h2>
                <p>Short and clear works best — students read these on their phones.</p>
              </div>
            </div>
            <div className="card-body">
              {optionsError && <Alert tone="error">{optionsError}</Alert>}
              {limited && (
                <div className="notify-note"><Icon.Info size={15} /> As a teacher you can reach the students of the batches you lead and the courses you teach.</div>
              )}

              <div className="label" style={{ marginBottom: 8 }}>Who should receive it?</div>
              <div className="audience-grid" role="radiogroup" aria-label="Audience">
                {choices.map((a) => {
                  const I = Icon[a.icon];
                  return (
                    <button key={a.id} type="button" role="radio" aria-checked={audience === a.id}
                      className={`audience ${audience === a.id ? 'active' : ''}`} onClick={() => setAudience(a.id)}>
                      <I size={18} />
                      <span><strong>{a.label}</strong><small>{a.help}</small></span>
                    </button>
                  );
                })}
              </div>

              {audience === 'course' && (
                <div className="field" style={{ marginTop: 14 }}>
                  <label htmlFor="n-course">Course</label>
                  <select id="n-course" value={courseId} onChange={(e) => setCourseId(e.target.value)} required>
                    <option value="">Choose a course…</option>
                    {options?.courses.map((c) => (
                      <option key={c.id} value={c.id}>{c.title} — {c.studentCount} student{c.studentCount === 1 ? '' : 's'}</option>
                    ))}
                  </select>
                </div>
              )}

              {audience === 'batch' && (
                <div className="field" style={{ marginTop: 14 }}>
                  <label htmlFor="n-batch">Batch</label>
                  <select id="n-batch" value={batchId} onChange={(e) => setBatchId(e.target.value)} required>
                    <option value="">Choose a batch…</option>
                    {options?.batches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name} — {b.studentCount} student{b.studentCount === 1 ? '' : 's'}</option>
                    ))}
                  </select>
                  {options && options.batches.length === 0 && <span className="hint">No batches to choose from yet.</span>}
                </div>
              )}

              {audience === 'students' && (
                <div className="field" style={{ marginTop: 14 }}>
                  <label htmlFor="n-search">Students <span className="muted">({studentIds.length} chosen)</span></label>
                  <div className="picker">
                    <div className="picker-search">
                      <Icon.Search size={15} />
                      <input id="n-search" value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} placeholder="Search by name, email or batch" />
                    </div>
                    <div className="picker-list">
                      {filteredStudents.length === 0 ? (
                        <div className="picker-empty">No students found.</div>
                      ) : (
                        filteredStudents.slice(0, 200).map((s) => (
                          <label key={s.id} className={`picker-row ${studentIds.includes(s.id) ? 'on' : ''}`}>
                            <input type="checkbox" checked={studentIds.includes(s.id)} onChange={() => toggleStudent(s.id)} />
                            <span className="picker-main">
                              <strong>{s.fullName}</strong>
                              <small>{s.email}{s.batchNames.length ? ` · ${s.batchNames.join(', ')}` : ''}</small>
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                    {studentIds.length > 0 && (
                      <div className="picker-foot">
                        <button type="button" className="link-btn" onClick={() => setStudentIds([])}>Clear selection</button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="label" style={{ margin: '16px 0 8px' }}>Type</div>
              <div className="chips">
                {TYPES.map((c) => {
                  const I = Icon[c.icon];
                  return (
                    <button key={c.type} type="button" className={`chip ${type === c.type ? 'active' : ''}`} onClick={() => setType(c.type)}>
                      <I size={15} /> {c.label}
                    </button>
                  );
                })}
              </div>

              <div className="field" style={{ marginTop: 18 }}>
                <label htmlFor="n-title">Title</label>
                <input id="n-title" value={title} maxLength={TITLE_MAX} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Speaking class tonight at 19:00" required />
                <span className="hint">{title.length}/{TITLE_MAX}</span>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="n-msg">Message</label>
                <textarea id="n-msg" rows={4} maxLength={MESSAGE_MAX} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="What do they need to know or do?" required />
                <span className="hint">{message.length}/{MESSAGE_MAX}</span>
              </div>
            </div>
            <div className="card-foot row-end">
              {estimate !== null && <span className="muted xs" style={{ marginRight: 'auto' }}>Reaches about {estimate} {estimate === 1 ? 'person' : 'people'}</span>}
              <button className="btn btn-primary" type="submit" disabled={!ready || sending}>
                <Icon.Send size={17} /> Review &amp; send
              </button>
            </div>
          </form>
        ) : (
          <section className="card">
            <div className="card-body">
              <EmptyState icon="Lock" title="View only" text="You can read your notifications here. Ask the Super Admin for full Notifications access to send announcements." />
            </div>
          </section>
        )}

        <div className="notify-side">
          {canSend && (
            <section className="card">
              <div className="card-head"><h2>Preview</h2><span className="muted xs">How it looks on a phone</span></div>
              <div className="card-body">
                <div className="phone-preview">
                  <div className="push">
                    <Logo size={30} withText={false} />
                    <div className="push-body">
                      <div className="push-top"><strong>SS Europa</strong><span>now</span></div>
                      <div className="push-title"><TypeIcon size={13} /> {title || 'Your title'}</div>
                      <p>{message || 'Your message will appear here.'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          <section className="card">
            <div className="card-head">
              <div>
                <h2>Your inbox</h2>
                <p>{inbox.unreadCount ? `${inbox.unreadCount} unread` : 'All read'}</p>
              </div>
              {inbox.unreadCount > 0 && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => void inbox.markAllRead()}>
                  <Icon.Check size={15} /> Mark all read
                </button>
              )}
            </div>
            <div className="card-body inbox-body">
              <div className="chips" style={{ marginBottom: 12 }}>
                <button type="button" className={`chip ${inboxFilter === 'all' ? 'active' : ''}`} onClick={() => setInboxFilter('all')}>All <span className="count">{inbox.recent.length}</span></button>
                <button type="button" className={`chip ${inboxFilter === 'unread' ? 'active' : ''}`} onClick={() => setInboxFilter('unread')}>Unread <span className="count">{inbox.unreadCount}</span></button>
              </div>
              {!inbox.loaded ? (
                <Spinner />
              ) : inboxItems.length === 0 ? (
                <EmptyState icon="Bell" title={inboxFilter === 'unread' ? 'Nothing unread' : 'No notifications yet'} />
              ) : (
                <ul className="inbox">
                  {inboxItems.map((n) => {
                    const I = Icon[NOTIFICATION_ICON[notificationTypeName(n.type)] ?? 'Info'];
                    const link = adminNotificationLink(n);
                    return (
                      <li key={n.id} className={n.isRead ? '' : 'unread'}>
                        <span className="inbox-icon"><I size={16} /></span>
                        <div className="inbox-main">
                          <div className="inbox-top">
                            <strong>{n.title}</strong>
                            <span className="muted xs nowrap">{timeAgo(n.createdAtUtc)}</span>
                          </div>
                          <p>{n.message}</p>
                          <div className="inbox-actions">
                            {link && <button type="button" className="link-btn" onClick={() => { if (!n.isRead) void inbox.markRead(n.id); navigate(link); }}>Open</button>}
                            {!n.isRead && <button type="button" className="link-btn" onClick={() => void inbox.markRead(n.id)}>Mark as read</button>}
                            <button type="button" className="link-btn muted-link" onClick={() => void inbox.remove(n.id)}>Delete</button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>

      <section className="card" style={{ marginTop: 20 }}>
        <div className="card-head">
          <div>
            <h2>Sent announcements</h2>
            <p>{can('notifications', 'Full') ? 'Delivery and read statistics update as students open them.' : 'Announcements you sent.'}</p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void loadHistory(historyPage)} disabled={historyLoading}>
            <Icon.Refresh size={15} /> Refresh
          </button>
        </div>
        <div className="card-body" style={{ paddingTop: 0 }}>
          {historyLoading && !history ? (
            <Spinner />
          ) : !history || history.items.length === 0 ? (
            <EmptyState icon="Megaphone" title="Nothing sent yet" text="Announcements you send appear here with how many people received and read them." />
          ) : (
            <>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Announcement</th>
                      <th>Audience</th>
                      <th>Sent</th>
                      <th style={{ textAlign: 'right' }}>Delivered</th>
                      <th style={{ minWidth: 150 }}>Read</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.items.map((b) => {
                      const pct = b.deliveredCount ? Math.round((b.readCount / b.deliveredCount) * 100) : 0;
                      const I = Icon[NOTIFICATION_ICON[b.type] ?? 'Megaphone'];
                      return (
                        <tr key={b.id}>
                          <td>
                            <div className="sent-title"><I size={14} /> <strong>{b.title}</strong></div>
                            <div className="muted xs sent-msg">{b.message}</div>
                          </td>
                          <td><span className="badge badge-blue">{b.audienceDescription}</span></td>
                          <td className="nowrap">
                            <div>{formatDate(b.createdAtUtc, true)}</div>
                            <div className="muted xs">{b.senderName} · {b.senderRole}</div>
                          </td>
                          <td style={{ textAlign: 'right' }}><strong>{b.deliveredCount}</strong></td>
                          <td>
                            <div className="read-meter" title={`${b.readCount} of ${b.deliveredCount} read`}>
                              <span style={{ width: `${pct}%` }} />
                            </div>
                            <div className="muted xs">{b.readCount} read · {pct}%</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {history.totalPages > 1 && (
                <div className="pager">
                  <button type="button" className="btn btn-ghost btn-sm" disabled={historyPage <= 1 || historyLoading} onClick={() => void loadHistory(historyPage - 1)}>
                    <Icon.ChevronLeft size={15} /> Newer
                  </button>
                  <span className="muted xs">Page {history.page} of {history.totalPages}</span>
                  <button type="button" className="btn btn-ghost btn-sm" disabled={historyPage >= history.totalPages || historyLoading} onClick={() => void loadHistory(historyPage + 1)}>
                    Older <Icon.ChevronRight size={15} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <Modal
        open={confirming}
        onClose={() => !sending && setConfirming(false)}
        title="Send this notification?"
        subtitle={`To ${audienceLabel}${estimate !== null ? ` · about ${estimate} ${estimate === 1 ? 'person' : 'people'}` : ''}`}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setConfirming(false)} disabled={sending}>Back</button>
            <button type="button" className="btn btn-primary" onClick={() => void send()} disabled={sending}>
              <Icon.Send size={16} /> {sending ? 'Sending…' : 'Send now'}
            </button>
          </>
        }
      >
        <div className="push" style={{ marginBottom: 4 }}>
          <Logo size={30} withText={false} />
          <div className="push-body">
            <div className="push-top"><strong>SS Europa</strong><span>now</span></div>
            <div className="push-title"><TypeIcon size={13} /> {title}</div>
            <p style={{ WebkitLineClamp: 'unset' }}>{message}</p>
          </div>
        </div>
        <p className="muted xs" style={{ marginTop: 12 }}>It can't be unsent. Students can delete it from their own list.</p>
      </Modal>
    </div>
  );
}
