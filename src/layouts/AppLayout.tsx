import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Icon, type IconName } from '../components/Icons';
import { Avatar, Logo } from '../components/ui';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { NotificationsProvider, useNotifications } from '../hooks/useNotifications';
import { NotificationBell } from '../components/NotificationBell';
import { PERMISSION_MODULES, roleLabel, type PermissionModule, type UserRole } from '../types';
import './layout.css';

type NavItem = { to: string; label: string; icon: IconName; roles: UserRole[]; end?: boolean; module?: PermissionModule };
type NavGroup = { title: string; items: NavItem[] };

const ALL: UserRole[] = ['SuperAdmin', 'Admin', 'Staff', 'Mentor'];

const NAV: NavGroup[] = [
  { title: 'Overview', items: [{ to: '/app', label: 'Dashboard', icon: 'Grid', roles: ALL, end: true }] },
  { title: 'Admissions', items: [{ to: '/app/enquiries', label: 'Admissions & Leads', icon: 'Inbox', roles: ALL, module: 'enquiries' }] },
  {
    title: 'Students',
    items: [
      { to: '/app/students', label: 'Students', icon: 'Users', roles: ALL, module: 'students' },
      { to: '/app/batches', label: 'Batches', icon: 'Layers', roles: ALL, module: 'batches' },
    ],
  },
  {
    title: 'Teaching',
    items: [
      { to: '/app/courses', label: 'Courses & Content', icon: 'Book', roles: ALL, module: 'courses' },
      { to: '/app/translations', label: 'Translations', icon: 'Globe', roles: ALL, module: 'translations' },
      { to: '/app/classes', label: 'Live Classes', icon: 'Video', roles: ALL, module: 'classes' },
    ],
  },
  { title: 'Communication', items: [{ to: '/app/notifications', label: 'Notifications', icon: 'Bell', roles: ALL, module: 'notifications' }] },
  {
    title: 'Administration',
    items: [
      { to: '/app/team', label: 'Team', icon: 'Shield', roles: ['SuperAdmin'] },
      { to: '/app/audit', label: 'Audit Log', icon: 'ShieldCheck', roles: ['SuperAdmin'] },
    ],
  },
];

/** Title shown in the top bar for the current address. */
function pageTitle(path: string): { title: string; parent?: { to: string; label: string } } {
  if (path.startsWith('/app/profile')) return { title: 'My profile' };
  if (/^\/app\/courses\/[^/]+\/lessons\//.test(path)) return { title: 'Lesson editor', parent: { to: '/app/courses', label: 'Courses' } };
  if (/^\/app\/courses\/[^/]+/.test(path)) return { title: 'Course builder', parent: { to: '/app/courses', label: 'Courses' } };
  for (const g of NAV) for (const i of g.items) if (i.end ? path === i.to : path.startsWith(i.to)) return { title: i.label };
  return { title: 'Dashboard' };
}

export function AppLayout() {
  return (
    <NotificationsProvider>
      <Shell />
    </NotificationsProvider>
  );
}

function Shell() {
  const { user, logout, isDemo, hasRole, can } = useAuth();
  const { unreadCount: unread } = useNotifications();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sseuropa_admin_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const canSeeNotifications = can('notifications');

  const toggleSidebar = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sseuropa_admin_sidebar_collapsed', String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  // Close menus when the page changes. (The unread count is live: see NotificationsProvider.)
  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  // Ctrl+B collapses the sidebar.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleSidebar]);

  // Click outside closes the account menu.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  async function onLogout() {
    await logout();
    navigate('/login');
  }

  const allowed = (i: NavItem) => hasRole(...i.roles) && (!i.module || can(i.module));
  const groups = NAV.map((g) => ({ ...g, items: g.items.filter(allowed) })).filter((g) => g.items.length > 0);
  // The page belongs to a module this member can only look at: say so before they try to change anything.
  const currentItem = NAV.flatMap((g) => g.items).find((i) => i.module && location.pathname.startsWith(i.to));
  const viewOnly = currentItem?.module && can(currentItem.module) && !can(currentItem.module, 'Full')
    ? PERMISSION_MODULES.find((m) => m.key === currentItem.module)?.label
    : null;
  const { title, parent } = pageTitle(location.pathname);
  // The lesson editor needs every pixel of width.
  const wide = /\/lessons\//.test(location.pathname);

  return (
    <div className={`shell ${collapsed ? 'is-collapsed' : ''} ${mobileOpen ? 'is-mobile-open' : ''}`}>
      <aside className="sidebar" aria-label="Main navigation">
        <div className="sidebar-brand">
          <Link to="/app" className="sidebar-logo" title="SS Europa">
            <Logo size={40} withText={!collapsed} />
          </Link>
          <button type="button" className="icon-btn ghost sidebar-close" onClick={() => setMobileOpen(false)} aria-label="Close menu">
            <Icon.X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {groups.map((g) => (
            <div className="nav-group" key={g.title}>
              <div className="nav-group-title">{g.title}</div>
              {g.items.map((i) => {
                const I = Icon[i.icon];
                return (
                  <NavLink
                    key={i.to}
                    to={i.to}
                    end={i.end}
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    title={collapsed ? i.label : undefined}
                  >
                    <I size={19} />
                    <span className="nav-label">{i.label}</span>
                    {i.to === '/app/notifications' && unread > 0 && <span className="nav-count">{unread}</span>}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">
          {isDemo && (
            <div className="sidebar-demo" title="Local demonstration data">
              <Icon.Sparkles size={16} />
              <span className="nav-label">Demo data</span>
            </div>
          )}
          <div className="sidebar-role">
            <span className="sidebar-flag" aria-hidden><span /><span /><span /></span>
            <span className="nav-label">
              Signed in as <strong>{roleLabel(user?.role)}</strong>
            </span>
          </div>
          <button type="button" className="nav-item collapse-btn" onClick={toggleSidebar} title={collapsed ? 'Expand menu (Ctrl+B)' : 'Collapse menu (Ctrl+B)'}>
            {collapsed ? <Icon.ChevronRight size={19} /> : <Icon.ChevronLeft size={19} />}
            <span className="nav-label">Collapse menu</span>
          </button>
        </div>
      </aside>

      <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} aria-hidden />

      <div className="main">
        <header className="topbar">
          <button type="button" className="icon-btn ghost topbar-menu" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Icon.Menu size={20} />
          </button>

          <div className="topbar-title">
            {parent && (
              <>
                <Link to={parent.to}>{parent.label}</Link>
                <Icon.ChevronRight size={14} />
              </>
            )}
            <span>{title}</span>
          </div>

          <div className="topbar-actions">
            <button
              type="button"
              className="icon-btn ghost"
              onClick={toggleTheme}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Icon.Sun size={19} /> : <Icon.Moon size={19} />}
            </button>

            {/* Everyone has their own notifications; the notification centre page needs the Notifications module. */}
            <NotificationBell canOpenPage={canSeeNotifications} />

            <div className="account" ref={menuRef}>
              <button type="button" className="account-btn" onClick={() => setMenuOpen((v) => !v)} aria-expanded={menuOpen} aria-haspopup="menu">
                <Avatar name={user?.fullName} />
                <span className="account-meta">
                  <strong>{user?.fullName || 'Team member'}</strong>
                  <span>{roleLabel(user?.role)}</span>
                </span>
                <Icon.ChevronDown size={16} />
              </button>
              {menuOpen && (
                <div className="account-menu" role="menu">
                  <div className="account-menu-head">
                    <Avatar name={user?.fullName} size="lg" />
                    <div>
                      <strong>{user?.fullName}</strong>
                      <span>{user?.email}</span>
                      <span className="badge badge-blue" style={{ marginTop: 6, alignSelf: 'flex-start' }}>{roleLabel(user?.role)}</span>
                    </div>
                  </div>
                  <Link to="/app/profile" className="account-item" role="menuitem" onClick={() => setMenuOpen(false)}>
                    <Icon.Settings size={18} /> My profile
                  </Link>
                  <button type="button" className="account-item" role="menuitem" onClick={toggleTheme}>
                    {isDark ? <Icon.Sun size={18} /> : <Icon.Moon size={18} />}
                    {isDark ? 'Light mode' : 'Dark mode'}
                  </button>
                  <button type="button" className="account-item danger" role="menuitem" onClick={() => void onLogout()}>
                    <Icon.Logout size={18} /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className={`content ${wide ? 'is-wide' : ''}`}>
          {viewOnly && (
            <div className="view-only-bar" role="status">
              <Icon.Eye size={16} />
              <span>
                <strong>View only.</strong> You can look at {viewOnly} but not change anything{viewOnly === 'Students' ? ', except sending the login to new paid students' : ''}. Ask the Super Admin if you need full access.
              </span>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
