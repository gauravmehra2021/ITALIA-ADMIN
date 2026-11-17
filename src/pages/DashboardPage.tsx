import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Empty, ErrorBox, Loading } from '../components/StateBlock';
import { useAuth } from '../hooks/useAuth';
import { announcementsApi, dashboardApi } from '../services/platformApi';
import type { AdminDashboard, Announcement, DashboardStats, MentorDashboard, StaffDashboard } from '../types';

export function DashboardPage() {
  const { user, hasRole } = useAuth();
  const [student, setStudent] = useState<DashboardStats | null>(null);
  const [admin, setAdmin] = useState<AdminDashboard | null>(null);
  const [mentor, setMentor] = useState<MentorDashboard | null>(null);
  const [staff, setStaff] = useState<StaffDashboard | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const notes = await announcementsApi.list();
        setAnnouncements(notes);
        if (hasRole('Admin', 'SuperAdmin')) setAdmin(await dashboardApi.admin());
        else if (hasRole('Mentor')) setMentor(await dashboardApi.mentor());
        else if (hasRole('Staff')) setStaff(await dashboardApi.staff());
        else setStudent(await dashboardApi.student());
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    })();
  }, [hasRole]);

  if (loading) return <Loading label="Loading SS Europa executive dashboard…" />;
  if (error) return <ErrorBox message={error} />;

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--ink)', margin: 0, letterSpacing: '-0.4px' }}>
                  Welcome back, {user?.firstName || 'Administrator'}
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
                  {user?.role || 'Admin'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '3px', margin: '6px 0 6px 0' }}>
                <span style={{ width: '28px', height: '3.5px', background: '#008C45', borderRadius: '2px' }} />
                <span style={{ width: '28px', height: '3.5px', background: 'var(--line)', borderRadius: '2px' }} />
                <span style={{ width: '28px', height: '3.5px', background: '#CD212A', borderRadius: '2px' }} />
              </div>
              <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.92rem' }}>
                SS Europa international executive control center & operational metrics.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Link
            to="/app/courses"
            style={{
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
            }}
          >
            <span>📚 Manage Courses</span>
          </Link>
          <Link
            to="/app/enquiries"
            style={{
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
            }}
          >
            <span>🎯 Admissions Desk</span>
          </Link>
        </div>
      </div>

      {/* ── Executive Metric Cards (Admin / SuperAdmin) ── */}
      {admin && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
          }}
        >
          {[
            { label: 'Total Users', val: admin.totalUsers, color: '#0284C7', bg: '#EFF6FF', icon: '👥' },
            { label: 'Active Courses', val: admin.totalCourses, color: '#16A34A', bg: '#F0FDF4', icon: '📚' },
            { label: 'Active Enrollments', val: admin.activeEnrollments, color: '#8B5CF6', bg: '#F5F3FF', icon: '🎓' },
          ].map((m) => (
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {m.label}
                </span>
                <span style={{ fontSize: '1.1rem', background: m.bg, padding: '4px 8px', borderRadius: '8px' }}>
                  {m.icon}
                </span>
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: m.color, marginTop: '8px', letterSpacing: '-0.5px' }}>
                {m.val}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Staff Desk Stats ── */}
      {staff && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
          }}
        >
          {[
            { label: 'Total Enquiries', val: staff.totalEnquiries, color: '#0284C7', bg: '#EFF6FF', icon: '📋' },
            { label: 'New Leads', val: staff.newEnquiries, color: '#16A34A', bg: '#F0FDF4', icon: '✨' },
            { label: 'In Follow-Up', val: staff.inFollowUpEnquiries, color: '#D97706', bg: '#FFFBEB', icon: '⏳' },
            { label: 'Enrolled Leads', val: staff.enrolledEnquiries, color: '#059669', bg: '#ECFDF5', icon: '🎉' },
            { label: 'Unread Alerts', val: staff.unreadNotifications, color: '#EC4899', bg: '#FDF2F8', icon: '🔔' },
          ].map((m) => (
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                  {m.label}
                </span>
                <span style={{ fontSize: '1.1rem', background: m.bg, padding: '4px 8px', borderRadius: '8px' }}>
                  {m.icon}
                </span>
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: m.color, marginTop: '8px' }}>
                {m.val}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Student / Mentor Views ── */}
      {student && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem' }}>
          <div className="stat"><span>Enrolled courses</span><strong>{student.enrolledCourses}</strong></div>
          <div className="stat"><span>Upcoming classes</span><strong>{student.upcomingClasses}</strong></div>
          <div className="stat"><span>Avg. progress</span><strong>{student.averageProgress}%</strong></div>
          <div className="stat"><span>Tests completed</span><strong>{student.completedTests}</strong></div>
          <div className="stat"><span>Certificates</span><strong>{student.certificates}</strong></div>
          <div className="stat"><span>Unread alerts</span><strong>{student.unreadNotifications}</strong></div>
        </div>
      )}

      {mentor && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="stat"><span>Assigned classes</span><strong>{mentor.assignedClasses}</strong></div>
          <div className="stat"><span>Students</span><strong>{mentor.assignedStudents}</strong></div>
          <div className="stat"><span>Materials</span><strong>{mentor.materials}</strong></div>
        </div>
      )}

      {/* ── Operational Quick Access Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
        <Link
          to="/app/courses"
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
              <span style={{ fontSize: '1.8rem' }}>📚</span>
              <span style={{ background: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 700, fontSize: '0.78rem', padding: '4px 10px', borderRadius: '9999px' }}>
                Curriculum Core
              </span>
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--ink)', margin: '0 0 6px' }}>
              Courses & Content
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.88rem', margin: 0, lineHeight: 1.45 }}>
              Architect course hierarchy (Modules, Chapters, Lessons), manage AWS S3 uploads for video/PDF, and publish live to students.
            </p>
          </div>
          <div style={{ marginTop: '1.25rem', color: 'var(--primary)', fontWeight: 700, fontSize: '0.88rem' }}>
            Manage Course Catalogue →
          </div>
        </Link>

        <Link
          to="/app/enquiries"
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
              <span style={{ fontSize: '1.8rem' }}>🎯</span>
              <span style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#16A34A', fontWeight: 700, fontSize: '0.78rem', padding: '4px 10px', borderRadius: '9999px' }}>
                Pipeline
              </span>
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--ink)', margin: '0 0 6px' }}>
              Admissions & Leads Desk
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.88rem', margin: 0, lineHeight: 1.45 }}>
              Track student intake funnel from public website enquiries, assign staff follow-ups, and convert leads into registered students.
            </p>
          </div>
          <div style={{ marginTop: '1.25rem', color: '#16A34A', fontWeight: 700, fontSize: '0.88rem' }}>
            Open Lead Conversion Desk →
          </div>
        </Link>

        <Link
          to="/app/classes"
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
              <span style={{ fontSize: '1.8rem' }}>🎥</span>
              <span style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#D97706', fontWeight: 700, fontSize: '0.78rem', padding: '4px 10px', borderRadius: '9999px' }}>
                Live Stream
              </span>
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--ink)', margin: '0 0 6px' }}>
              Live Classes & Zoom
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.88rem', margin: 0, lineHeight: 1.45 }}>
              Schedule live conversational Italian batches, assign native mentors, manage join links, and track attendance.
            </p>
          </div>
          <div style={{ marginTop: '1.25rem', color: '#D97706', fontWeight: 700, fontSize: '0.88rem' }}>
            View Scheduled Classes →
          </div>
        </Link>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--ink)', margin: 0 }}>
              📢 Global Announcements & Operations Log
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '0.86rem', margin: '3px 0 0' }}>
              System-wide notices broadcasted to students and staff.
            </p>
          </div>
          <Link
            to="/app/notifications"
            style={{
              fontSize: '0.84rem',
              fontWeight: 700,
              color: 'var(--primary)',
              textDecoration: 'none',
            }}
          >
            Dispatch Notification →
          </Link>
        </div>

        {announcements.length === 0 ? (
          <Empty label="No active system announcements." />
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--ink)' }}>{a.title}</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>Active Notice</span>
                </div>
                <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: '0.88rem', lineHeight: 1.45 }}>{a.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
