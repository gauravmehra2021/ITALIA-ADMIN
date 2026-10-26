import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Empty, ErrorBox, Loading } from '../components/StateBlock';
import { useAuth } from '../hooks/useAuth';
import { announcementsApi, dashboardApi } from '../services/platformApi';
import type { AdminDashboard, Announcement, DashboardStats, MentorDashboard } from '../types';

export function DashboardPage() {
  const { user, hasRole } = useAuth();
  const [student, setStudent] = useState<DashboardStats | null>(null);
  const [admin, setAdmin] = useState<AdminDashboard | null>(null);
  const [mentor, setMentor] = useState<MentorDashboard | null>(null);
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
        else if (!hasRole('Staff')) setStudent(await dashboardApi.student());
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    })();
  }, [hasRole]);

  if (loading) return <Loading label="Loading dashboard…" />;
  if (error) return <ErrorBox message={error} />;

  return (
    <div className="animate-rise">
      <div className="page-header">
        <div>
          <h1>Welcome, {user?.firstName}</h1>
          <p>Your role-aware learning workspace for SS Europa.</p>
        </div>
        {hasRole('Staff') ? (
          <Link className="btn btn-azure" to="/app/enquiries">Open Admissions Desk</Link>
        ) : (
          <Link className="btn btn-azure" to="/app/ai">Open AI Tutor</Link>
        )}
      </div>

      {hasRole('Staff') && (
        <div className="panel" style={{ marginBottom: '1.25rem', borderLeft: '4px solid var(--azure)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Admissions & Lead Conversion Desk</h2>
              <p style={{ margin: '0.25rem 0 0', color: 'var(--muted)', fontSize: '0.92rem' }}>
                Manage prospective student enquiries from the public website, update lead follow-up stages, and record internal staff notes.
              </p>
            </div>
            <Link className="btn btn-azure" to="/app/enquiries">
              Manage Enquiries & Leads →
            </Link>
          </div>
        </div>
      )}

      {student && (
        <div className="grid-3" style={{ marginBottom: '1.25rem' }}>
          <div className="stat"><span>Enrolled courses</span><strong>{student.enrolledCourses}</strong></div>
          <div className="stat"><span>Upcoming classes</span><strong>{student.upcomingClasses}</strong></div>
          <div className="stat"><span>Avg. progress</span><strong>{student.averageProgress}%</strong></div>
          <div className="stat"><span>Tests completed</span><strong>{student.completedTests}</strong></div>
          <div className="stat"><span>Certificates</span><strong>{student.certificates}</strong></div>
          <div className="stat"><span>Unread alerts</span><strong>{student.unreadNotifications}</strong></div>
        </div>
      )}

      {mentor && (
        <div className="grid-3" style={{ marginBottom: '1.25rem' }}>
          <div className="stat"><span>Assigned classes</span><strong>{mentor.assignedClasses}</strong></div>
          <div className="stat"><span>Students</span><strong>{mentor.assignedStudents}</strong></div>
          <div className="stat"><span>Materials</span><strong>{mentor.materials}</strong></div>
        </div>
      )}

      {admin && (
        <div className="grid-3" style={{ marginBottom: '1.25rem' }}>
          <div className="stat"><span>Users</span><strong>{admin.totalUsers}</strong></div>
          <div className="stat"><span>Courses</span><strong>{admin.totalCourses}</strong></div>
          <div className="stat"><span>Active enrollments</span><strong>{admin.activeEnrollments}</strong></div>
          <div className="stat"><span>Open tickets</span><strong>{admin.openTickets}</strong></div>
          <div className="stat"><span>Revenue (mock)</span><strong>€{admin.totalRevenue}</strong></div>
          <div className="stat"><span>Subscriptions</span><strong>{admin.activeSubscriptions}</strong></div>
        </div>
      )}

      <div className="panel">
        <h2 style={{ marginBottom: '0.75rem' }}>Announcements</h2>
        {announcements.length === 0 ? (
          <Empty label="No announcements." />
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {announcements.map((a) => (
              <article key={a.id}>
                <strong>{a.title}</strong>
                <p style={{ margin: '0.25rem 0 0', color: 'var(--muted)' }}>{a.body}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
