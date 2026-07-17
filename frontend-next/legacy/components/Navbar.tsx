'use client';

import SmartImage from '@/components/shared/smart-image';

import { useEffect, useState, useRef } from 'react';
import { Link, useLocation, useNavigate } from '@/lib/router-compat';
import { Menu, X, Heart, LogIn, LogOut, Search, User, Bell, Settings, CreditCard, HelpCircle, Sparkles, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supportService } from '../services/supportService';

const publicLinks = [
  { name: 'Home', path: '/' },
  { name: 'Stories', path: '/success-stories' },
  { name: 'Membership', path: '/membership' },
  { name: 'About', path: '/about' },
  { name: 'Contact', path: '/contact' },
];

const memberLinks = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Matches', path: '/search' },
  { name: 'Compare', path: '/compare' },
  { name: 'Messages', path: '/messages' },
  { name: 'Membership', path: '/membership' },
  { name: 'Support', path: '/tickets' },
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 16);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsDropdownOpen(false);
  }, [location.pathname]);

  // Fetch unread notifications count if user is authenticated and is a MEMBER
  useEffect(() => {
    if (!isAuthenticated || user?.account_type !== 'MEMBER') {
      setUnreadCount(0);
      return;
    }
    const fetchUnread = async () => {
      try {
        const res = await supportService.getUnreadNotificationsCount();
        setUnreadCount(res.unread_count);
      } catch (err) {
        console.error('Failed to load notifications count:', err);
      }
    };
    void fetchUnread();
    // Poll count every 30 seconds
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, user]);

  // Click outside listener for profile dropdown
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const isMember = isAuthenticated && user?.account_type === 'MEMBER';
  const navLinks = isMember ? memberLinks : publicLinks;
  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const portalHome = user?.account_type === 'SUPER_ADMIN' ? '/super-admin/dashboard'
    : user?.account_type === 'ADMIN' ? '/admin/dashboard'
      : user?.account_type === 'STAFF' ? '/staff/dashboard'
        : user?.account_type === 'CUSTOMER_SUPPORT' ? '/support/dashboard'
          : '/dashboard';

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const memberInitials = user?.full_name
    ? user.full_name.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase()
    : 'U';

  return (
    <header className={`lc-navbar${isScrolled ? ' scrolled' : ''}`}>
      <div className="lc-navbar-inner">

        {/* Left Section: Logo & Links */}
        <div className="flex items-center gap-8">
          <Link to="/" className="lc-logo" aria-label="My Dear Partner - back to home">
            <span className="lc-logo-icon" aria-hidden="true">
              <Heart />
            </span>
            <span className="lc-logo-text">
              My Dear <em>Partner</em>
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-1" aria-label="Main navigation">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                id={`nav-${link.name.toLowerCase()}`}
                className={`lc-nav-link${isActive(link.path) ? ' active' : ''}`}
              >
                {link.name}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right Section: Search, Notifications & Profile Avatar */}
        <div className="flex items-center gap-4 flex-shrink-0">
          
          {/* Search Bar (Seeker dashboard search) */}
          {isMember && (
            <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center relative">
              <input
                type="text"
                placeholder="Search matches..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-40 focus:w-60 bg-white/40 hover:bg-white/60 focus:bg-white text-sm px-4 py-2 pl-9 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary-500)] transition-all duration-300 placeholder-gray-500"
              />
              <Search className="w-4 h-4 text-gray-500 absolute left-3 pointer-events-none" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 text-gray-400 hover:text-gray-600 text-xs font-bold"
                >
                  âœ•
                </button>
              )}
            </form>
          )}

          {/* Notifications Icon Bell */}
          {isMember && (
            <Link
              to="/notifications"
              className="relative p-2 text-gray-600 hover:text-[var(--theme-primary-700)] hover:bg-gray-100/60 rounded-full transition-colors duration-200"
              aria-label="View notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-1 ring-white">
                  {unreadCount}
                </span>
              )}
            </Link>
          )}

          {/* User Auth Portal Actions */}
          {isAuthenticated ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2 p-1 pl-2 pr-3 rounded-full hover:bg-gray-100/60 transition-all border border-gray-100 shadow-sm cursor-pointer"
                aria-haspopup="true"
                aria-expanded={isDropdownOpen}
              >
                {user?.photo ? (
                  <SmartImage
                    src={user.photo}
                    alt={user.full_name}
                    className="w-8 h-8 rounded-full object-cover shadow-inner"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--theme-primary-600)] to-[var(--theme-primary-800)] text-white text-xs font-bold flex items-center justify-center shadow-inner">
                    {memberInitials}
                  </div>
                )}
                <span className="hidden sm:inline text-xs font-bold text-gray-800 flex items-center gap-1">
                  Profile <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                </span>
              </button>

              {/* Profile Dropdown panel */}
              {isDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl border border-gray-100 shadow-xl py-2 z-50 animate-fade-in-up origin-top-right">
                  <div className="px-4 py-2 border-b border-gray-100 mb-1">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Signed in as</p>
                    <p className="text-sm font-semibold text-gray-800 truncate">{user?.full_name}</p>
                  </div>
                  <Link
                    to={isMember && user?.id ? `/profile/${user.id}` : portalHome}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-rose-50 hover:text-[var(--theme-primary-700)] transition-colors"
                  >
                    <User className="w-4 h-4 text-gray-400" />
                    {isMember ? 'My Profile' : 'Open portal'}
                  </Link>
                  {isMember && <><Link
                    to="/settings"
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-rose-50 hover:text-[var(--theme-primary-700)] transition-colors"
                  >
                    <Settings className="w-4 h-4 text-gray-400" />
                    Settings
                  </Link>
                  <Link
                    to="/membership"
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-rose-50 hover:text-[var(--theme-primary-700)] transition-colors"
                  >
                    <CreditCard className="w-4 h-4 text-gray-400" />
                    Membership
                  </Link>
                  <Link
                    to="/notifications"
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-rose-50 hover:text-[var(--theme-primary-700)] transition-colors"
                  >
                    <Bell className="w-4 h-4 text-gray-400" />
                    Notifications
                  </Link>
                  <Link
                    to="/tickets"
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-rose-50 hover:text-[var(--theme-primary-700)] transition-colors"
                  >
                    <HelpCircle className="w-4 h-4 text-gray-400" />
                    Help &amp; Support
                  </Link></>}
                  <hr className="my-1 border-gray-100" />
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden lg:flex items-center gap-3">
              <Link to="/login" className="lc-btn-outline" id="nav-login">
                <LogIn /> Login
              </Link>
              <Link to="/register" className="lc-btn-signup" id="nav-signup">
                <Sparkles /> Sign Up Free
              </Link>
            </div>
          )}

          {/* Hamburger Mobile Menu toggle */}
          <button
            type="button"
            className="lg:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-full"
            id="nav-hamburger"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer menu */}
      {isMobileMenuOpen && (
        <>
          <div
            aria-hidden="true"
            onClick={() => setIsMobileMenuOpen(false)}
            style={{
              position: 'fixed', inset: '72px 0 0 0', zIndex: 98,
              background: 'rgba(43,16,29,.45)', backdropFilter: 'blur(4px)',
            }}
          />
          <div className="fixed top-[72px] inset-x-0 bg-[#f7f1e8] border-b border-gray-200 z-99 flex flex-col p-6 space-y-4 shadow-xl lg:hidden">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="text-base font-bold text-gray-800 hover:text-[var(--theme-primary-700)] transition-colors py-2 border-b border-gray-100"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}

            {isAuthenticated ? (
              <button
                type="button"
                className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 text-red-600 font-bold rounded-xl transition-all"
                onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
              >
                <LogOut className="w-5 h-5" /> Sign Out
              </button>
            ) : (
              <div className="flex flex-col space-y-3 pt-4">
                <Link
                  to="/login"
                  className="w-full flex justify-center py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="w-full flex justify-center py-2.5 rounded-xl bg-gradient-to-r from-[var(--theme-primary-700)] to-[var(--theme-primary-900)] text-white font-bold"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Sign Up Free
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </header>
  );
}
