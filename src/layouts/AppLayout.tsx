import { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { roleLabel } from '../types';
import './layout.css';

const NavIcons = {
  Sun: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  ),
  Moon: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  ),
  ChevronLeft: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  ChevronRight: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  Dashboard: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ),
  Admissions: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <polyline points="16 11 18 13 22 9" />
    </svg>
  ),
  Courses: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c0 3 6 3 6 3s6 0 6-3v-5" />
    </svg>
  ),
  LiveClasses: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  ),
  Notifications: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  Users: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Audit: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  Logout: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
};

export function AppLayout() {
  const { user, logout, isDemo, hasRole } = useAuth();
  const { theme, isDark, toggleTheme, setTheme } = useTheme();

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sseuropa_admin_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sseuropa_admin_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Keyboard shortcuts: Ctrl+B (Sidebar toggle) & Ctrl+Shift+D (Theme toggle)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        toggleTheme();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleTheme]);

  const getInitials = (name?: string) => {
    if (!name) return 'AD';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className={`shell ${collapsed ? 'is-collapsed' : ''}`}>
      {/* ── Admin Left Sidebar ── */}
      <aside className={`sidebar ${collapsed ? 'is-collapsed' : ''}`}>
        {/* Brand Header */}
        <div className={`sidebar-brand ${collapsed ? 'is-collapsed' : ''}`}>
          {!collapsed ? (
            <>
              <div className="brand-header-left">
                <span
                  className="brand-mark"
                  onClick={toggleSidebar}
                  title="Click to collapse sidebar (Ctrl+B)"
                  aria-hidden
                />
                <div>
                  <div className="brand-name">SS Europa</div>
                  <div className="brand-subtitle">
                    <span>Management Console</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="sidebar-toggle-btn"
                onClick={toggleSidebar}
                title="Collapse sidebar (Ctrl+B)"
                aria-label="Collapse sidebar"
              >
                <NavIcons.ChevronLeft />
              </button>
            </>
          ) : (
            <>
              <span
                className="brand-mark"
                onClick={toggleSidebar}
                title="SS Europa Management Console (Click to expand sidebar)"
                aria-hidden
              />
              <button
                type="button"
                className="sidebar-toggle-btn"
                onClick={toggleSidebar}
                title="Expand sidebar (Ctrl+B)"
                aria-label="Expand sidebar"
              >
                <NavIcons.ChevronRight />
              </button>
            </>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="side-nav">
          <NavLink
            to="/app"
            end
            className={({ isActive }) => `side-nav-link ${isActive ? 'active' : ''}`}
            data-tooltip="Dashboard"
            title={collapsed ? "Dashboard" : undefined}
          >
            <span className="nav-icon"><NavIcons.Dashboard /></span>
            <span>Dashboard</span>
          </NavLink>

          {/* Admissions CRM: Staff and Administrators */}
          {(hasRole('Staff') || hasRole('Admin') || hasRole('SuperAdmin')) && (
            <NavLink
              to="/app/enquiries"
              className={({ isActive }) => `side-nav-link ${isActive ? 'active' : ''}`}
              data-tooltip="Admissions & Leads"
              title={collapsed ? "Admissions & Leads" : undefined}
            >
              <span className="nav-icon"><NavIcons.Admissions /></span>
              <span>Admissions & Leads</span>
            </NavLink>
          )}

          {/* Academic Modules: Teachers and Administrators */}
          {(hasRole('Mentor') || hasRole('Admin') || hasRole('SuperAdmin')) && (
            <>
              <NavLink
                to="/app/courses"
                className={({ isActive }) => `side-nav-link ${isActive ? 'active' : ''}`}
                data-tooltip="Courses & Content"
                title={collapsed ? "Courses & Content" : undefined}
              >
                <span className="nav-icon"><NavIcons.Courses /></span>
                <span>Courses & Content</span>
              </NavLink>
              <NavLink
                to="/app/classes"
                className={({ isActive }) => `side-nav-link ${isActive ? 'active' : ''}`}
                data-tooltip="Live Classes"
                title={collapsed ? "Live Classes" : undefined}
              >
                <span className="nav-icon"><NavIcons.LiveClasses /></span>
                <span>Live Classes</span>
              </NavLink>
            </>
          )}

          {/* Platform Communication: Teachers and Administrators */}
          {(hasRole('Mentor') || hasRole('Admin') || hasRole('SuperAdmin')) && (
            <NavLink
              to="/app/notifications"
              className={({ isActive }) => `side-nav-link ${isActive ? 'active' : ''}`}
              data-tooltip="Notifications"
              title={collapsed ? "Notifications" : undefined}
            >
              <span className="nav-icon"><NavIcons.Notifications /></span>
              <span>Notifications</span>
            </NavLink>
          )}

          {/* Team Management: Super Admin only (creates Admin, Staff and Teacher accounts) */}
          {hasRole('SuperAdmin') && (
            <NavLink
              to="/app/users"
              className={({ isActive }) => `side-nav-link ${isActive ? 'active' : ''}`}
              data-tooltip="Users & Roles"
              title={collapsed ? "Users & Roles" : undefined}
            >
              <span className="nav-icon"><NavIcons.Users /></span>
              <span>Users & Roles</span>
            </NavLink>
          )}

          {/* Governance & Audit: Super Admin Only */}
          {hasRole('SuperAdmin') && (
            <NavLink
              to="/app/audit"
              className={({ isActive }) => `side-nav-link ${isActive ? 'active' : ''}`}
              data-tooltip="Audit Log"
              title={collapsed ? "Audit Log" : undefined}
            >
              <span className="nav-icon"><NavIcons.Audit /></span>
              <span>Audit Log</span>
            </NavLink>
          )}
        </nav>

        {/* Sidebar Footer with Theme Switcher & User Avatar Chip */}
        <div className="sidebar-foot">
          {/* Theme Switcher */}
          {!collapsed ? (
            <div className="theme-toggle-container">
              <button
                type="button"
                className={`theme-toggle-pill ${theme === 'light' ? 'active' : ''}`}
                onClick={() => setTheme('light')}
                title="Light Mode"
              >
                <NavIcons.Sun />
                <span>Light</span>
              </button>
              <button
                type="button"
                className={`theme-toggle-pill ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => setTheme('dark')}
                title="Dark Mode"
              >
                <NavIcons.Moon />
                <span>Dark</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="theme-toggle-btn-collapsed"
              onClick={toggleTheme}
              title={isDark ? "Switch to Light Mode (Ctrl+Shift+D)" : "Switch to Dark Mode (Ctrl+Shift+D)"}
              data-tooltip={isDark ? "Light Mode" : "Dark Mode"}
              aria-label="Toggle light and dark mode"
            >
              {isDark ? <NavIcons.Sun /> : <NavIcons.Moon />}
            </button>
          )}

          {/* Demo Sandbox Tag */}
          {isDemo && (
            !collapsed ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '6px', fontSize: '0.72rem', color: '#FBBF24', fontWeight: 700 }}>
                <span>⚡</span>
                <span>Demo Sandbox Mode</span>
              </div>
            ) : (
              <div className="demo-badge-collapsed" data-tooltip="Demo Sandbox Mode" title="Demo Sandbox Mode">
                <span>⚡</span>
              </div>
            )
          )}

          {/* User Profile Card */}
          <div
            className={`user-profile-card ${collapsed ? 'is-collapsed' : ''}`}
            data-tooltip={`${user?.fullName || 'SS Europa'} (${roleLabel(user?.role)})`}
            title={collapsed ? `${user?.fullName || 'SS Europa'} (${roleLabel(user?.role)})` : undefined}
          >
            <div className="user-avatar-circle">
              {getInitials(user?.fullName)}
            </div>
            {!collapsed && (
              <div className="user-meta">
                <strong className="user-name">{user?.fullName || 'SS Europa Admin'}</strong>
                <span className="user-role-badge">{roleLabel(user?.role)}</span>
              </div>
            )}
          </div>

          {/* Sign Out Button */}
          <button
            className={`sidebar-logout-btn ${collapsed ? 'is-collapsed' : ''}`}
            type="button"
            onClick={() => void logout()}
            title="Sign out from management console"
            data-tooltip="Sign Out"
          >
            <NavIcons.Logout />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* ── Main Application Workspace ── */}
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}

export default AppLayout;
