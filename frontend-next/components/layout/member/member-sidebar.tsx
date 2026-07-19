'use client';

import { useState, useEffect, useRef, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HeartHandshake, LayoutDashboard, Search, Heart, Star,
  MessageSquareMore, Bell, ShieldCheck, CreditCard,
  Settings, TicketCheck, ChevronDown, LogOut, Menu, X,
  ChevronLeft,
} from 'lucide-react';
import { useAuth } from '@/legacy/contexts/AuthContext';
import ProfileImage from '@/components/profile/ProfileImage';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Search', icon: Search, href: '/search' },
  { label: 'Matches', icon: Heart, href: '/matches' },
  { label: 'Shortlist', icon: Star, href: '/shortlist' },
  { label: 'Messages', icon: MessageSquareMore, href: '/messages' },
  { label: 'Notifications', icon: Bell, href: '/notifications', badge: true },
  { label: 'Verification', icon: ShieldCheck, href: '/verification' },
  { label: 'Membership', icon: CreditCard, href: '/membership' },
  { label: 'Settings', icon: Settings, href: '/settings' },
  { label: 'Support', icon: TicketCheck, href: '/tickets' },
];

export function MemberSidebar({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const displayName = user?.full_name || [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Member';
  const initials = displayName.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase();

  return (
    <div className="min-h-screen bg-app-bg">
      {/* Mobile backdrop */}
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-surface border-r border-line transform transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-line shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2.5" aria-label="My Dear Partner dashboard">
            <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-rose-500 to-plum-800 shadow-[0_4px_12px_rgba(142,61,88,0.35)]">
              <HeartHandshake className="w-4 h-4 text-gold-300" />
            </span>
            <span className="font-display font-extrabold text-sm text-ink tracking-tight">
              My Dear <em className="not-italic text-rose-500">Partner</em>
            </span>
          </Link>
          <button
            type="button"
            className="lg:hidden p-1.5 rounded-lg hover:bg-rose-500/5 text-muted"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5" aria-label="Member navigation">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-rose-500/10 text-rose-600 shadow-sm'
                    : 'text-muted hover:text-ink hover:bg-rose-500/5'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-rose-500' : ''}`} />
                <span>{item.label}</span>
                {item.badge && <span className="ml-auto w-2 h-2 rounded-full bg-rose-500" />}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="border-t border-line p-3 shrink-0">
          <div className="flex items-center gap-2 px-3 py-2 text-[10px] text-muted">
            <ShieldCheck className="w-3 h-3" />
            <span>Secure session</span>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 bg-surface/90 backdrop-blur-md border-b border-line flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="lg:hidden p-2 rounded-lg hover:bg-rose-500/5 text-muted"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link href="/" className="flex items-center gap-2 text-sm text-muted hover:text-ink transition-colors">
              <ChevronLeft className="w-4 h-4" />
              Public site
            </Link>
          </div>

          <div className="flex items-center gap-3" ref={profileRef}>
            <Link
              href="/notifications"
              className="relative p-2 rounded-xl hover:bg-rose-500/5 text-muted hover:text-ink transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
            </Link>

            <div className="relative">
              <button
                type="button"
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-rose-500/5 transition-colors"
                onClick={() => setProfileOpen((v) => !v)}
                aria-expanded={profileOpen}
                aria-label="User menu"
              >
                <ProfileImage
                  photoId={undefined}
                  src={undefined}
                  variant="thumbnail"
                  alt=""
                  size="sm"
                  shape="circle"
                  className="w-8 h-8 rounded-full bg-cream-200"
                />
                <span className="hidden sm:block text-sm font-semibold text-ink max-w-[120px] truncate">
                  {displayName}
                </span>
                <ChevronDown className="w-4 h-4 text-muted hidden sm:block" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-surface border border-line rounded-2xl shadow-lg py-2 z-50">
                  <div className="px-4 py-3 border-b border-line">
                    <p className="font-bold text-sm text-ink truncate">{displayName}</p>
                    <p className="text-xs text-muted truncate">{user?.email}</p>
                  </div>
                  <div className="py-1">
                    <Link href="/profile/me" className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted hover:text-ink hover:bg-rose-500/5 transition-colors">
                      <HeartHandshake className="w-4 h-4" />
                      My Profile
                    </Link>
                    <Link href="/settings" className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted hover:text-ink hover:bg-rose-500/5 transition-colors">
                      <Settings className="w-4 h-4" />
                      Settings
                    </Link>
                  </div>
                  <div className="border-t border-line pt-1">
                    <button
                      type="button"
                      onClick={async () => { await logout(); window.location.assign('/login'); }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-error hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
