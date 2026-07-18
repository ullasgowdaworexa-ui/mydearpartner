'use client';

import SmartImage from '@/components/shared/smart-image';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, Outlet } from '@/lib/router-compat';
import {
  Bell, BriefcaseBusiness, Building2, ChevronDown, ChevronLeft, ChevronRight,
  HeartHandshake, LogOut, Menu, Search, ShieldCheck, UserRound, X,
} from 'lucide-react';
import {
  adminNavigation, adminNavSections, canAccessAdminItem, findAdminNavItem, normalizeAdminPath,
} from '../../admin/navigation';
import { useAuth, type AdminRole } from '../../contexts/AuthContext';

const roleLabels: Record<AdminRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  STAFF: 'Staff',
  CUSTOMER_SUPPORT: 'Customer Support',
};

export default function AdminLayout({ children }: { children?: ReactNode } = {}) {
  const { user, logout, hasAdminPermission } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [query, setQuery] = useState('');
  const profileRef = useRef<HTMLDivElement>(null);
  const sidebarNavRef = useRef<HTMLElement>(null);

  const role = (user?.admin_role || (user?.is_superuser ? 'SUPER_ADMIN' : 'ADMIN')) as AdminRole;
  const portalPaths = {
    SUPER_ADMIN: { dashboard: '/super-admin/dashboard', login: '/super-admin/login' },
    ADMIN: { dashboard: '/admin/dashboard', login: '/admin/login' },
    STAFF: { dashboard: '/staff/dashboard', login: '/staff/login' },
    CUSTOMER_SUPPORT: { dashboard: '/support/dashboard', login: '/support/login' },
  } as const;
  const currentPortal = portalPaths[user?.account_type as keyof typeof portalPaths] || portalPaths.ADMIN;
  const dashboardPath = currentPortal.dashboard;
  const loginPath = currentPortal.login;
  
  const getSidebarPath = useCallback((itemPath: string) => {
    if (user?.account_type === 'SUPER_ADMIN') {
      // Remap /admin/admin-management â†’ /super-admin/accounts (SA-specific page name)
      if (itemPath === '/admin/admin-management') return '/super-admin/accounts';
      // All other /admin/* paths map uniformly to /super-admin/*
      if (itemPath.startsWith('/admin/')) return itemPath.replace('/admin/', '/super-admin/');
      // Already a /super-admin/* path (e.g. departments, designations injected dynamically)
      return itemPath;
    }
    if (user?.account_type === 'CUSTOMER_SUPPORT' && itemPath.startsWith('/customer-support/')) {
      return itemPath.replace('/customer-support/', '/support/');
    }
    return itemPath;
  }, [user]);

  const navigation = useMemo(() => {
    let list = adminNavigation.filter((item) => canAccessAdminItem(item, role, user?.admin_permissions || []));
    if (user?.account_type === 'STAFF') {
      return list.filter((item) => item.path.startsWith('/staff/'));
    }
    if (user?.account_type === 'CUSTOMER_SUPPORT') {
      return list.filter((item) => item.path.startsWith('/customer-support/') || item.path.startsWith('/support/'));
    }
    if (user?.account_type === 'SUPER_ADMIN') {
      // Filter out redundant staff and customer support items for Super Admin
      list = list.filter((item) => item.path !== '/admin/staff' && item.path !== '/admin/customer-support');
      
      // Inject Departments and Designations dynamically for Super Admin
      const hasDept = list.some(item => item.path === '/super-admin/departments');
      if (!hasDept) {
        list.push({
          path: '/super-admin/departments',
          label: 'Departments',
          description: 'Manage company departments.',
          icon: Building2,
          section: 'Management',
          implemented: true,
        });
        list.push({
          path: '/super-admin/designations',
          label: 'Designations',
          description: 'Manage roles and designations.',
          icon: BriefcaseBusiness,
          section: 'Management',
          implemented: true,
        });
      }
    }
    return list;
  }, [role, user?.admin_permissions, user?.account_type]);

  useEffect(() => {
    setCollapsed(localStorage.getItem('mdp.admin.sidebar_collapsed') === 'true');
  }, []);

  const activeItem = findAdminNavItem(location.pathname);

  // Restore scroll position of the sidebar nav on location or navigation changes
  useEffect(() => {
    const restoreScroll = () => {
      const savedScroll = sessionStorage.getItem('mdp.admin.sidebar_scroll');
      if (savedScroll && sidebarNavRef.current) {
        sidebarNavRef.current.scrollTop = parseInt(savedScroll, 10);
      }
    };
    restoreScroll();
    const timer = setTimeout(restoreScroll, 50);
    return () => clearTimeout(timer);
  }, [location.pathname, navigation]);

  const handleSidebarScroll = () => {
    if (sidebarNavRef.current) {
      sessionStorage.setItem('mdp.admin.sidebar_scroll', String(sidebarNavRef.current.scrollTop));
    }
  };

  useEffect(() => {
    localStorage.setItem('mdp.admin.sidebar_collapsed', String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('admin-drawer-open', mobileOpen);
    return () => document.body.classList.remove('admin-drawer-open');
  }, [mobileOpen]);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const term = query.trim();
    if (!term) return;
    if (user?.account_type === 'STAFF') navigate(`/staff/tasks?search=${encodeURIComponent(term)}`);
    else if (user?.account_type === 'CUSTOMER_SUPPORT') navigate(`/support/tickets?search=${encodeURIComponent(term)}`);
    else if (user?.account_type === 'SUPER_ADMIN') navigate(`/super-admin/members?search=${encodeURIComponent(term)}`);
    else navigate(`/admin/members?search=${encodeURIComponent(term)}`);
    setQuery('');
  };

  const handleLogout = async () => {
    await logout();
    navigate(loginPath, { replace: true });
  };

  const displayName = user?.full_name || [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Administrator';
  const initials = displayName.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase();

  return (
    <div className={`admin-app ${collapsed ? 'admin-sidebar-collapsed' : ''}`}>
      <button type="button" className={`admin-drawer-backdrop ${mobileOpen ? 'visible' : ''}`} onClick={() => setMobileOpen(false)} aria-label="Close navigation" />
      <aside className={`admin-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="admin-brand-row">
          <Link to={dashboardPath} className="admin-brand" aria-label="My Dear Partner admin dashboard">
            <span><HeartHandshake /></span>
            <div><strong>My Dear Partner</strong><small>Control centre</small></div>
          </Link>
          <button type="button" className="admin-mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X /></button>
        </div>

        <div className="admin-role-card">
          <span><ShieldCheck /></span>
          <div><small>Signed in as</small><strong>{user?.admin_role_display || user?.admin_role_name || roleLabels[role]}</strong></div>
        </div>

        <nav className="admin-sidebar-nav" aria-label="Admin navigation" ref={sidebarNavRef} onScroll={handleSidebarScroll}>
          {adminNavSections.map((section) => {
            const items = navigation.filter((item) => item.section === section);
            if (!items.length) return null;
            return (
              <div className="admin-nav-section" key={section}>
                <p>{section}</p>
                {items.map((item) => {
                  const Icon = item.icon;
                  const targetPath = getSidebarPath(item.path);
                  const active = normalizeAdminPath(location.pathname) === normalizeAdminPath(targetPath)
                    || (normalizeAdminPath(targetPath) !== '/admin/dashboard' && normalizeAdminPath(location.pathname).startsWith(`${normalizeAdminPath(targetPath)}/`));
                  return (
                    <Link key={item.path} to={targetPath} className={`admin-nav-link ${active ? 'active' : ''}`} title={collapsed ? item.label : undefined}>
                      <Icon />
                      <span>{item.shortLabel || item.label}</span>
                      {active && <i />}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-security-note"><ShieldCheck /><span><strong>Secure session</strong><small>Permission checks active</small></span></div>
          <button type="button" className="admin-collapse-btn" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed ? <ChevronRight /> : <ChevronLeft />}
          </button>
        </div>
      </aside>

      <div className="admin-main-column">
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <button type="button" className="admin-menu-btn" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu /></button>
            <div className="admin-breadcrumb"><small>{roleLabels[role]} workspace</small><strong>{activeItem?.label || 'Dashboard'}</strong></div>
          </div>

          <form className="admin-global-search" onSubmit={handleSearch}>
            <Search />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={role === 'STAFF' ? 'Search assigned workâ€¦' : 'Search usersâ€¦'} aria-label="Search admin workspace" />
            <kbd>Enter</kbd>
          </form>

          <div className="admin-topbar-actions">
            {hasAdminPermission('notifications.manage') && <Link to={user?.account_type === 'SUPER_ADMIN' ? '/super-admin/notifications' : '/admin/notifications'} className="admin-icon-btn admin-notification-btn" aria-label="Notifications"><Bell /><i /></Link>}
            <div className="admin-profile-menu" ref={profileRef}>
              <button type="button" className="admin-profile-trigger" onClick={() => setProfileOpen((value) => !value)} aria-expanded={profileOpen}>
                <span className="admin-avatar">{user?.id ? <img src={`/api/proxy/users/${user.id}/avatar/`} alt="" /> : initials}</span>
                <span className="admin-profile-copy"><strong>{displayName}</strong><small>{user?.admin_role_display || user?.admin_role_name || roleLabels[role]}</small></span>
                <ChevronDown />
              </button>
              {profileOpen && (
                <div className="admin-profile-dropdown">
                  <div><strong>{displayName}</strong><span>{user?.email}</span></div>
                  <Link to="/"><UserRound /> Public website</Link>
                  <button type="button" onClick={handleLogout}><LogOut /> Sign out securely</button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="admin-main-content">{children || <Outlet />}</main>
      </div>
    </div>
  );
}
