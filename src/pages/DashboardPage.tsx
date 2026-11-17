import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Empty, ErrorBox, Loading } from '../components/StateBlock';
import { useAuth } from '../hooks/useAuth';
import { announcementsApi, dashboardApi } from '../services/platformApi';
import {
  roleLabel,
  type AdminDashboard,
  type Announcement,
  type MentorDashboard,
  type StaffDashboard,
  type SuperAdminDashboard,
} from '../types';

/* ────────────────────────────────────────────────────────────────────────────
 * One dashboard per role:
 *   Super Admin → team overview + operations
 *   Admin       → operations (courses, classes, leads)
 *   Staff       → admissions & leads pipeline
 *   Teacher     → own classes, courses and students   (internal role: Mentor)
 * ──────────────────────────────────────────────────────────────────────────── */

type Metric = { label: string; val: number | string; color: string; bg: string; icon: string };
type QuickLink = { to: string; icon: string; tag: string; tagColor: string; title: string; desc: string; cta: string };

const QUICK = {
  team: { to: '/app/users', icon: '👥', tag: 'Super Admin', tagColor: '#7C3AED', title: 'Users & Roles', desc: 'Create Admin, Staff and Teacher accounts, change roles, and suspend access.', cta: 'Manage team →' },
  leads: { to: '/app/enquiries', icon: '🎯', tag: 'Pipeline', tagColor: '#16A34A', title: 'Admissions & Leads', desc: 'Website contact-form enquiries. Follow up, update status, and note each call.', cta: 'Open admissions desk →' },
  courses: { to: '/app/courses', icon: '📚', tag: 'Curriculum', tagColor: '#1E88E5', title: 'Courses & Content', desc: 'Build modules, chapters and lessons, upload videos and PDFs, and publish to students.', cta: 'Manage courses →' },
  classes: { to: '/app/classes', icon: '🎥', tag: 'Live', tagColor: '#D97706', title: 'Live Classes', desc: 'Schedule live Italian classes, share join links and track attendance.', cta: 'View classes →' },
  notify: { to: '/app/notifications', icon: '🔔', tag: 'Comms', tagColor: '#EC4899', title: 'Notifications', desc: 'Send updates to students about classes, tests and announcements.', cta: 'Send a notification →' },
  audit: { to: '/app/audit', icon: '🛡️', tag: 'Security', tagColor: '#475569', title: 'Audit Log', desc: 'See who logged in and what changed across the platform.', cta: 'Open audit log →' },
} satisfies Record<string, QuickLink>;

function operationsMetrics(o: AdminDashboard): Metric[] {
  return [
    { label: 'Students', val: o.totalStudents, color: '#0284C7', bg: '#EFF6FF', icon: '🎓' },
    { label: 'Published Courses', val: `${o.publishedCourses} / ${o.totalCourses}`, color: '#16A34A', bg: '#F0FDF4', icon: '📚' },
    { label: 'Active Enrollments', val: o.activeEnrollments, color: '#8B5CF6', bg: '#F5F3FF', icon: '✅' },
    { label: 'Upcoming Classes', val: o.upcomingClasses, color: '#D97706', bg: '#FFFBEB', icon: '🎥' },
    { label: 'New Leads', val: o.newEnquiries, color: '#0369A1', bg: '#E0F2FE', icon: '✨' },
    { label: 'In Follow-Up', val: o.inFollowUpEnquiries, color: '#B45309', bg: '#FEF3C7', icon: '⏳' },
    { label: 'Enrolled Leads', val: o.enrolledEnquiries, color: '#059669', bg: '#ECFDF5', icon: '🎉' },
  ];
}

export function DashboardPage() {
  const { user, hasRole } = useAuth();
  const [superAdmin, setSuperAdmin] = useState<SuperAdminDashboard | null>(null);
  const [admin, setAdmin] = useState<AdminDashboard | null>(null);
  const [teacher, setTeacher] = useState<MentorDashboard | null>(null);
  const [staff, setStaff] = useState<StaffDashboard | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = hasRole('SuperAdmin');
  const isAdmin = hasRole('Admin');
  const isStaff = hasRole('Staff');
  const isTeacher = hasRole('Mentor');

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const [notes] = await Promise.all([
          announcementsApi.list().catch(() => [] as Announcement[]),
          isSuperAdmin
            ? dashboardApi.superAdmin().then(setSuperAdmin)
            : isAdmin
              ? dashboardApi.admin().then(setAdmin)
              : isStaff
                ? dashboardApi.staff().then(setStaff)
                : isTeacher
                  ? dashboardApi.mentor().then(setTeacher)
                  : Promise.resolve(),
        ]);
        setAnnouncements(notes);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    })();
  }, [isSuperAdmin, isAdmin, isStaff, isTeacher]);

  if (loading) return <Loading label="Loading your dashboard…" />;
  if (error) return <ErrorBox message={error} />;

  const view = isSuperAdmin
    ? {
        subtitle: 'You are the only Super Admin. Create team accounts and oversee everything.',
        primary: { to: '/app/users', label: '👥 Add Team Member' },
        secondary: { to: '/app/enquiries', label: '🎯 Admissions Desk' },
        links: [QUICK.team, QUICK.leads, QUICK.courses, QUICK.classes, QUICK.notify, QUICK.audit],
      }
    : isAdmin
      ? {
          subtitle: 'Operations overview: courses, live classes and admissions.',
          primary: { to: '/app/courses', label: '📚 Manage Courses' },
          secondary: { to: '/app/enquiries', label: '🎯 Admissions Desk' },
          links: [QUICK.leads, QUICK.courses, QUICK.classes, QUICK.notify],
        }
      : isStaff
        ? {
            subtitle: 'Website enquiries waiting for you. Contact new leads and keep their status up to date.',
            primary: { to: '/app/enquiries', label: '🎯 Open Admissions Desk' },
            secondary: null,
            links: [QUICK.leads],
          }
        : {
            subtitle: 'Your classes, courses and students.',
            primary: { to: '/app/classes', label: '🎥 My Live Classes' },
            secondary: { to: '/app/courses', label: '📚 Courses & Content' },
            links: [QUICK.classes, QUICK.courses, QUICK.notify],
          };

  const canSendNotifications = isSuperAdmin || isAdmin || isTeacher;

  return (
    <div
      className="animate-rise"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.75rem',
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* ── Page Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--ink)', margin: 0, letterSpacing: '-0.4px' }}>
              Welcome back, {user?.firstName || 'there'}
            </h1>
            <span
              style={{
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                padding: '3px 10px',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}
            >
              {roleLabel(user?.role)}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '3px', margin: '6px 0 6px 0' }}>
            <span style={{ width: '28px', height: '3.5px', background: '#008C45', borderRadius: '2px' }} />
            <span style={{ width: '28px', height: '3.5px', background: 'var(--line)', borderRadius: '2px' }} />
            <span style={{ width: '28px', height: '3.5px', background: '#CD212A', borderRadius: '2px' }} />
          </div>
          <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.92rem' }}>{view.subtitle}</p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Link to={view.primary.to} style={primaryBtn}>
            <span>{view.primary.label}</span>
          </Link>
          {view.secondary && (
            <Link to={view.secondary.to} style={secondaryBtn}>
              <span>{view.secondary.label}</span>
            </Link>
          )}
        </div>
      </div>

      {/* ── Super Admin: team + operations ── */}
      {superAdmin && (
        <>
          <Section title="Your team">
            <MetricGrid
              metrics={[
                { label: 'Admins', val: superAdmin.admins, color: '#7C3AED', bg: '#F5F3FF', icon: '🛡️' },
                { label: 'Staff', val: superAdmin.staff, color: '#0284C7', bg: '#EFF6FF', icon: '🗂️' },
                { label: 'Teachers', val: superAdmin.teachers, color: '#16A34A', bg: '#F0FDF4', icon: '👩‍🏫' },
                { label: 'Suspended Accounts', val: superAdmin.suspendedTeamAccounts, color: '#DC2626', bg: '#FEF2F2', icon: '⛔' },
              ]}
            />
          </Section>
          <Section title="Operations">
            <MetricGrid metrics={operationsMetrics(superAdmin.operations)} />
          </Section>
        </>
      )}

      {/* ── Admin: operations ── */}
      {admin && (
        <Section title="Operations">
          <MetricGrid metrics={operationsMetrics(admin)} />
        </Section>
      )}

      {/* ── Staff: admissions pipeline ── */}
      {staff && (
        <Section title="Admissions pipeline">
          <MetricGrid
            metrics={[
              { label: 'Total Enquiries', val: staff.totalEnquiries, color: '#0284C7', bg: '#EFF6FF', icon: '📋' },
              { label: 'New (Not Contacted)', val: staff.newEnquiries, color: '#16A34A', bg: '#F0FDF4', icon: '✨' },
              { label: 'In Follow-Up', val: staff.inFollowUpEnquiries, color: '#D97706', bg: '#FFFBEB', icon: '⏳' },
              { label: 'Enrolled', val: staff.enrolledEnquiries, color: '#059669', bg: '#ECFDF5', icon: '🎉' },
              { label: 'Closed', val: staff.closedEnquiries, color: '#475569', bg: '#F1F5F9', icon: '📁' },
            ]}
          />
        </Section>
      )}

      {/* ── Teacher: own classes ── */}
      {teacher && (
        <Section title="Your teaching">
          <MetricGrid
            metrics={[
              { label: 'Upcoming Classes', val: teacher.upcomingClasses, color: '#D97706', bg: '#FFFBEB', icon: '🎥' },
              { label: 'My Courses', val: teacher.coursesTaught, color: '#1E88E5', bg: '#EFF6FF', icon: '📚' },
              { label: 'My Students', val: teacher.assignedStudents, color: '#16A34A', bg: '#F0FDF4', icon: '🎓' },
              { label: 'Materials', val: teacher.materials, color: '#8B5CF6', bg: '#F5F3FF', icon: '📎' },
              { label: 'Classes Taught', val: teacher.pendingAttendance, color: '#059669', bg: '#ECFDF5', icon: '✅' },
            ]}
          />
        </Section>
      )}

      {/* ── Quick access (only pages this role can open) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
        {view.links.map((q) => (
          <QuickCard key={q.to} {...q} />
        ))}
      </div>

      {/* ── Announcements Feed ── */}
      <div
        style={{
          background: 'var(--card-bg)',
          borderRadius: '18px',
          border: '1px solid var(--card-border)',
          padding: '1.5rem',
          boxShadow: 'var(--shadow-sm)',
          transition: 'background-color 200ms ease, border-color 200ms ease',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--ink)', margin: 0 }}>📢 Announcements</h2>
            <p style={{ color: 'var(--muted)', fontSize: '0.86rem', margin: '3px 0 0' }}>
              Notices shared with students and the team.
            </p>
          </div>
          {canSendNotifications && (
            <Link to="/app/notifications" style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--primary)', textDecoration: 'none' }}>
              Send notification →
            </Link>
          )}
        </div>

        {announcements.length === 0 ? (
          <Empty label="No active announcements." />
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {announcements.map((a) => (
              <div
                key={a.id}
                style={{
                  background: 'var(--sand)',
                  borderRadius: '12px',
                  border: '1px solid var(--card-border-subtle)',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <strong style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--ink)' }}>{a.title}</strong>
                <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: '0.88rem', lineHeight: 1.45 }}>{a.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Building blocks ─────────────────────────────────────────────────────── */

const primaryBtn: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '10px 18px',
  background: '#1E88E5',
  color: '#FFFFFF',
  borderRadius: '10px',
  fontWeight: 700,
  fontSize: '0.9rem',
  textDecoration: 'none',
  boxShadow: '0 4px 14px rgba(30, 136, 229, 0.35)',
};

const secondaryBtn: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '10px 18px',
  background: 'var(--paper)',
  border: '1px solid var(--line)',
  color: 'var(--ink)',
  borderRadius: '10px',
  fontWeight: 700,
  fontSize: '0.9rem',
  textDecoration: 'none',
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <h2 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function MetricGrid({ metrics }: { metrics: Metric[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem' }}>
      {metrics.map((m) => (
        <div
          key={m.label}
          style={{
            background: 'var(--card-bg)',
            borderRadius: '16px',
            border: '1px solid var(--card-border)',
            padding: '1.25rem',
            boxShadow: 'var(--shadow-sm)',
            position: 'relative',
            overflow: 'hidden',
            transition: 'background-color 200ms ease, border-color 200ms ease',
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: m.color }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {m.label}
            </span>
            <span style={{ fontSize: '1.1rem', background: m.bg, padding: '4px 8px', borderRadius: '8px' }}>{m.icon}</span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: m.color, marginTop: '8px', letterSpacing: '-0.5px' }}>{m.val}</div>
        </div>
      ))}
    </div>
  );
}

function QuickCard({ to, icon, tag, tagColor, title, desc, cta }: QuickLink) {
  return (
    <Link
      to={to}
      style={{
        background: 'var(--card-bg)',
        borderRadius: '16px',
        border: '1px solid var(--card-border)',
        padding: '1.5rem',
        textDecoration: 'none',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: 'var(--shadow-sm)',
        transition: 'transform 0.18s ease, box-shadow 0.18s ease, background-color 200ms ease',
      }}
    >
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontSize: '1.8rem' }}>{icon}</span>
          <span
            style={{
              background: `${tagColor}1F`,
              color: tagColor,
              fontWeight: 700,
              fontSize: '0.78rem',
              padding: '4px 10px',
              borderRadius: '9999px',
            }}
          >
            {tag}
          </span>
        </div>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--ink)', margin: '0 0 6px' }}>{title}</h3>
        <p style={{ color: 'var(--muted)', fontSize: '0.88rem', margin: 0, lineHeight: 1.45 }}>{desc}</p>
      </div>
      <div style={{ marginTop: '1.25rem', color: tagColor, fontWeight: 700, fontSize: '0.88rem' }}>{cta}</div>
    </Link>
  );
}
