import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { Alert, EmptyState, Person, Spinner, StatCard, formatDate, timeAgo } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { CLASS_META, ENQUIRY_META, ENQUIRY_STAGES, classStatus, enquiryStatus, isUpcoming } from '../lib/status';
import { announcementsApi, classesApi, coursesApi, dashboardApi, enquiriesApi } from '../services/platformApi';
import type {
  AdminDashboard,
  Announcement,
  ClassSession,
  Course,
  Enquiry,
  MentorDashboard,
  StaffDashboard,
  SuperAdminDashboard,
} from '../types';
import './pages.css';

/* ────────────────────────────────────────────────────────────────────────────
 * One dashboard per role, built around "what needs attention today":
 *   Super Admin → team + operations + leads + classes
 *   Admin       → operations + leads + classes
 *   Staff       → admissions pipeline + new leads
 *   Teacher     → own classes + courses           (internal role: Mentor)
 * ──────────────────────────────────────────────────────────────────────────── */

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Buongiorno' : h < 18 ? 'Buon pomeriggio' : 'Buonasera';
}

export function DashboardPage() {
  const { user, hasRole, can } = useAuth();
  const isSuperAdmin = hasRole('SuperAdmin');
  const isAdmin = hasRole('Admin');
  const isStaff = hasRole('Staff');
  const isTeacher = hasRole('Mentor');
  const canLeads = can('enquiries');
  const canTeach = can('courses') || can('classes');

  const [superAdmin, setSuperAdmin] = useState<SuperAdminDashboard | null>(null);
  const [admin, setAdmin] = useState<AdminDashboard | null>(null);
  const [teacher, setTeacher] = useState<MentorDashboard | null>(null);
  const [staff, setStaff] = useState<StaffDashboard | null>(null);
  const [leads, setLeads] = useState<Enquiry[]>([]);
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const stats = isSuperAdmin
          ? dashboardApi.superAdmin().then((d) => alive && setSuperAdmin(d))
          : isAdmin
            ? dashboardApi.admin().then((d) => alive && setAdmin(d))
            : isStaff
              ? dashboardApi.staff().then((d) => alive && setStaff(d))
              : dashboardApi.mentor().then((d) => alive && setTeacher(d));
        const [notes, leadList, classList, courseList] = await Promise.all([
          announcementsApi.list().catch(() => [] as Announcement[]),
          canLeads ? enquiriesApi.list().catch(() => [] as Enquiry[]) : Promise.resolve([] as Enquiry[]),
          canTeach ? classesApi.list().catch(() => [] as ClassSession[]) : Promise.resolve([] as ClassSession[]),
          isTeacher ? coursesApi.list({ pageSize: 20 }).then((r) => r.items).catch(() => [] as Course[]) : Promise.resolve([] as Course[]),
          stats,
        ]);
        if (!alive) return;
        setAnnouncements(notes);
        setLeads(leadList);
        setClasses(classList);
        setCourses(courseList);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'Could not load the dashboard.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [isSuperAdmin, isAdmin, isStaff, isTeacher, canLeads, canTeach]);

  if (loading) return <Spinner label="Loading your dashboard…" />;

  const ops = superAdmin?.operations ?? admin;
  const newLeads = leads
    .filter((l) => enquiryStatus(l.status) === 'New')
    .sort((a, b) => +new Date(b.createdAtUtc) - +new Date(a.createdAtUtc));
  const followUps = leads.filter((l) => ['Contacted', 'Qualified'].includes(enquiryStatus(l.status)));
  const upcoming = classes.filter(isUpcoming).sort((a, b) => +new Date(a.scheduledAtUtc) - +new Date(b.scheduledAtUtc));

  const subtitle = isSuperAdmin
    ? 'Here’s an overview of your team, admissions and teaching.'
    : isAdmin
      ? 'Here’s what’s happening with admissions and teaching today.'
      : isStaff
        ? newLeads.length
          ? `You have ${newLeads.length} new ${newLeads.length === 1 ? 'enquiry' : 'enquiries'} waiting for a first call.`
          : 'All new enquiries have been contacted. Nice work!'
        : upcoming.length
          ? `Your next class is ${timeAgo(upcoming[0].scheduledAtUtc)}.`
          : 'No live classes booked yet — schedule your next one.';

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="dash-hello">{greeting()}, {user?.firstName || 'there'}!</div>
          <h1>Today at SS Europa</h1>
          <p>{subtitle}</p>
        </div>
        <div className="page-actions">
          {isSuperAdmin && (
            <Link to="/app/team" className="btn btn-primary"><Icon.UserPlus size={18} /> Add team member</Link>
          )}
          {isAdmin && (
            <Link to="/app/courses" className="btn btn-primary"><Icon.Book size={18} /> Manage courses</Link>
          )}
          {isStaff && (
            <Link to="/app/enquiries" className="btn btn-primary"><Icon.Inbox size={18} /> Open admissions</Link>
          )}
          {isTeacher && (
            <Link to="/app/classes" className="btn btn-primary"><Icon.Plus size={18} /> Schedule a class</Link>
          )}
        </div>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {/* ── Key numbers ── */}
      {ops && (
        <div className="stats">
          <StatCard icon="Cap" tone="blue" label="Students" value={ops.totalStudents} hint={`${ops.activeEnrollments} active enrolments`} />
          <StatCard icon="Inbox" tone="orange" label="New leads" value={ops.newEnquiries} hint={`${ops.inFollowUpEnquiries} in follow-up`} to="/app/enquiries" />
          <StatCard icon="Video" tone="purple" label="Upcoming classes" value={ops.upcomingClasses} to="/app/classes" />
          <StatCard icon="Book" tone="green" label="Published courses" value={`${ops.publishedCourses}/${ops.totalCourses}`} to="/app/courses" />
        </div>
      )}
      {staff && (
        <div className="stats">
          <StatCard icon="Inbox" tone="blue" label="All enquiries" value={staff.totalEnquiries} />
          <StatCard icon="Sparkles" tone="orange" label="New — call first" value={staff.newEnquiries} />
          <StatCard icon="Phone" tone="purple" label="In follow-up" value={staff.inFollowUpEnquiries} />
          <StatCard icon="CheckCircle" tone="green" label="Enrolled / Paid" value={staff.enrolledEnquiries} hint={staff.totalEnquiries ? `${Math.round((staff.enrolledEnquiries / staff.totalEnquiries) * 100)}% conversion` : undefined} />
        </div>
      )}
      {teacher && (
        <div className="stats">
          <StatCard icon="Video" tone="purple" label="Upcoming classes" value={teacher.upcomingClasses} to="/app/classes" />
          <StatCard icon="Book" tone="blue" label="My courses" value={teacher.coursesTaught} to="/app/courses" />
          <StatCard icon="Cap" tone="green" label="My students" value={teacher.assignedStudents} />
          <StatCard icon="CheckCircle" tone="teal" label="Classes taught" value={teacher.pendingAttendance} />
        </div>
      )}

      <div className="dash-grid">
        <div className="dash-main">
          {/* ── Leads needing a first call ── */}
          {canLeads && (
            <Card
              title="New enquiries to contact"
              subtitle="From the website contact form — call or WhatsApp them first."
              action={<Link to="/app/enquiries" className="btn btn-ghost btn-sm">View all <Icon.ArrowRight size={16} /></Link>}
            >
              {newLeads.length === 0 ? (
                <EmptyState icon="CheckCircle" title="You’re all caught up" text="Every new enquiry has been contacted." />
              ) : (
                <ul className="list">
                  {newLeads.slice(0, isStaff ? 8 : 5).map((l) => (
                    <li key={l.id}>
                      <Link to={`/app/enquiries?open=${l.id}`} className="list-row">
                        <Person name={l.fullName} sub={l.interestedCourse} />
                        <span className="list-meta">
                          <span className="muted xs">{timeAgo(l.createdAtUtc)}</span>
                          <Icon.ChevronRight size={16} />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {/* ── Upcoming classes ── */}
          {canTeach && (
            <Card
              title="Upcoming live classes"
              subtitle="Join links open from the Live Classes page."
              action={<Link to="/app/classes" className="btn btn-ghost btn-sm">All classes <Icon.ArrowRight size={16} /></Link>}
            >
              {upcoming.length === 0 ? (
                <EmptyState
                  icon="Calendar"
                  title="No classes scheduled"
                  text="Book the weekly speaking class so students can practise with a teacher."
                  action={<Link to="/app/classes" className="btn btn-secondary btn-sm"><Icon.Plus size={16} /> Schedule a class</Link>}
                />
              ) : (
                <ul className="list">
                  {upcoming.slice(0, 5).map((c) => {
                    const d = new Date(c.scheduledAtUtc);
                    const s = classStatus(c);
                    return (
                      <li key={c.id} className="list-row">
                        <span className="date-tile">
                          <span>{d.toLocaleDateString(undefined, { month: 'short' })}</span>
                          <strong>{d.getDate()}</strong>
                        </span>
                        <span className="list-main">
                          <strong>{c.title}</strong>
                          <span className="muted small">
                            {d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} · {c.durationMinutes} min · {c.courseTitle}
                          </span>
                        </span>
                        <span className={`badge badge-dot badge-${CLASS_META[s].tone}`}>{s === 'Live' ? 'Live now' : timeAgo(c.scheduledAtUtc)}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          )}

          {/* ── Teacher: my courses ── */}
          {isTeacher && (
            <Card title="Courses" action={<Link to="/app/courses" className="btn btn-ghost btn-sm">Open <Icon.ArrowRight size={16} /></Link>}>
              {courses.length === 0 ? (
                <EmptyState icon="Book" title="No courses yet" />
              ) : (
                <ul className="list">
                  {courses.slice(0, 5).map((c) => (
                    <li key={c.id}>
                      <Link to={`/app/courses/${c.id}`} className="list-row">
                        <span className="list-main">
                          <strong>{c.title}</strong>
                          <span className="muted small">{c.cefrLevel ? `${c.cefrLevel} · ` : ''}{c.lessonsCount ?? 0} lessons · {c.enrolledCount} {c.enrolledCount === 1 ? 'student' : 'students'}</span>
                        </span>
                        <Icon.ChevronRight size={16} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>

        <div className="dash-side">
          {/* ── Admissions pipeline ── */}
          {canLeads && leads.length > 0 && (
            <Card title="Admissions pipeline" subtitle={`${leads.length} enquiries · ${followUps.length} in follow-up`}>
              <Pipeline leads={leads} />
            </Card>
          )}

          {/* ── Super Admin: team ── */}
          {superAdmin && (
            <Card title="Your team" action={<Link to="/app/team" className="btn btn-ghost btn-sm">Manage <Icon.ArrowRight size={16} /></Link>}>
              <div className="team-grid">
                <TeamTile icon={<Icon.Shield size={18} />} tone="purple" label="Admins" value={superAdmin.admins} />
                <TeamTile icon={<Icon.Inbox size={18} />} tone="blue" label="Staff" value={superAdmin.staff} />
                <TeamTile icon={<Icon.Cap size={18} />} tone="green" label="Teachers" value={superAdmin.teachers} />
                <TeamTile icon={<Icon.Pause size={18} />} tone="red" label="Suspended" value={superAdmin.suspendedTeamAccounts} />
              </div>
            </Card>
          )}

          {/* ── Announcements ── */}
          <Card
            title="Announcements"
            action={canTeach ? <Link to="/app/notifications" className="btn btn-ghost btn-sm"><Icon.Send size={15} /> Send</Link> : undefined}
          >
            {announcements.length === 0 ? (
              <EmptyState icon="Megaphone" title="No announcements" />
            ) : (
              <ul className="notes">
                {announcements.slice(0, 4).map((a) => (
                  <li key={a.id}>
                    <strong>{a.title}</strong>
                    <p>{a.body}</p>
                    <span className="muted xs">{formatDate(a.createdAtUtc)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* ── Quick links ── */}
          {(isSuperAdmin || isAdmin) && (
            <Card title="Shortcuts">
              <div className="shortcuts">
                <Link to="/app/courses"><Icon.Book size={18} /> Course builder</Link>
                <Link to="/app/classes"><Icon.Video size={18} /> Live classes</Link>
                <Link to="/app/notifications"><Icon.Megaphone size={18} /> Send a notification</Link>
                {isSuperAdmin && <Link to="/app/audit"><Icon.ShieldCheck size={18} /> Audit log</Link>}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Building blocks ─────────────────────────────────────────────────────── */

function Card({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="card-body">{children}</div>
    </section>
  );
}

function TeamTile({ icon, tone, label, value }: { icon: ReactNode; tone: string; label: string; value: number }) {
  return (
    <div className={`team-tile tone-${tone}`}>
      <span className="stat-icon">{icon}</span>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function Pipeline({ leads }: { leads: Enquiry[] }) {
  const counts = ENQUIRY_STAGES.map((s) => ({ s, n: leads.filter((l) => enquiryStatus(l.status) === s).length }));
  const total = leads.length || 1;
  return (
    <div className="pipeline">
      <div className="pipeline-bar" role="img" aria-label="Enquiries by stage">
        {counts.filter((c) => c.n > 0).map((c) => (
          <span key={c.s} className={`tone-${ENQUIRY_META[c.s].tone}`} style={{ flexGrow: c.n }} title={`${c.s}: ${c.n}`} />
        ))}
      </div>
      <ul className="pipeline-legend">
        {counts.map((c) => (
          <li key={c.s}>
            <Link to={`/app/enquiries?status=${c.s}`}>
              <span className={`legend-dot tone-${ENQUIRY_META[c.s].tone}`} />
              <span>{ENQUIRY_META[c.s].label}</span>
              <strong>{c.n}</strong>
              <span className="muted xs">{Math.round((c.n / total) * 100)}%</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
