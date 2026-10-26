import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './layout.css';

export function AppLayout() {
  const { user, logout, isDemo, hasRole } = useAuth();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-mark" aria-hidden />
          <div>
            <div className="brand">SS Europa</div>
            <small>Management Console</small>
          </div>
        </div>

        <nav className="side-nav">
          <NavLink to="/app">Dashboard</NavLink>

          {/* Admissions CRM: Staff and Administrators */}
          {(hasRole('Staff') || hasRole('Admin') || hasRole('SuperAdmin')) && (
            <NavLink to="/app/enquiries">Admissions & Leads</NavLink>
          )}

          {/* Academic Modules: Teachers and Administrators */}
          {(hasRole('Mentor') || hasRole('Admin') || hasRole('SuperAdmin')) && (
            <>
              <NavLink to="/app/courses">Courses & Content</NavLink>
              <NavLink to="/app/classes">Live Classes</NavLink>
              <NavLink to="/app/assessments">Assessments</NavLink>
            </>
          )}

          {/* Platform Communication: Teachers, Staff, and Administrators */}
          <NavLink to="/app/notifications">Notifications Dispatcher</NavLink>

          {/* Support Helpdesk: Staff and Administrators */}
          {(hasRole('Staff') || hasRole('Admin') || hasRole('SuperAdmin')) && (
            <NavLink to="/app/support">Support Helpdesk</NavLink>
          )}

          {/* Operational Management: Administrators and Super Admins */}
          {(hasRole('Admin') || hasRole('SuperAdmin')) && (
            <>
              <NavLink to="/app/users">Users & Roles</NavLink>
              <NavLink to="/app/subscriptions">Payments Ledger</NavLink>
            </>
          )}

          {/* Governance & Audit: Super Admin Only */}
          {hasRole('SuperAdmin') && (
            <NavLink to="/app/audit">Audit Log</NavLink>
          )}
        </nav>

        <div className="sidebar-foot">
          {isDemo && <div className="badge badge-warn">Demo auth</div>}
          <div className="user-chip">
            <strong>{user?.fullName}</strong>
            <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
              {user?.role === 'Staff' && 'Staff · Admissions & Support'}
              {user?.role === 'Mentor' && 'Teacher · Course Instructor'}
              {user?.role === 'Admin' && 'Administrator · Operations'}
              {user?.role === 'SuperAdmin' && 'Super Admin · Governance'}
              {user?.role === 'User' && 'Student'}
            </span>
          </div>
          <button className="btn btn-secondary" type="button" onClick={() => void logout()}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
