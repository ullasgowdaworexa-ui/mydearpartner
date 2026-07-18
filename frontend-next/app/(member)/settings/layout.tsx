'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  User, Shield, CreditCard, Bell, Camera, Heart,
  Users, Briefcase, Star, ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/legacy/contexts/AuthContext';
import ProfileImage from '@/components/profile/ProfileImage';

const settingsNav = [
  { group: 'Profile', items: [
    { href: '/settings/profile', label: 'Basic & Lifestyle', icon: User },
    { href: '/settings/profile/personal', label: 'Personal & Religion', icon: Heart },
    { href: '/settings/profile/family', label: 'Family', icon: Users },
    { href: '/settings/profile/career', label: 'Career & Education', icon: Briefcase },
    { href: '/settings/profile/preferences', label: 'Partner Preferences', icon: Star },
  ]},
  { group: 'Account', items: [
    { href: '/settings/security', label: 'Security', icon: Shield },
    { href: '/settings/notifications', label: 'Notifications', icon: Bell },
    { href: '/settings/membership', label: 'Membership', icon: CreditCard },
  ]},
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link href="/dashboard">Dashboard</Link>
          <ChevronRight className="w-4 h-4" />
          <span>Settings</span>
        </div>
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="lg:w-64 shrink-0">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
              <div className="flex items-center gap-3 mb-4">
                <ProfileImage
                  photoId={undefined}
                  src={undefined}
                  variant="thumbnail"
                  alt=""
                  size="sm"
                  shape="circle"
                  className="w-12 h-12 rounded-full bg-gray-100"
                />
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate">{user?.full_name || 'Member'}</p>
                  <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                </div>
              </div>
              <Link
                href="/profile/me"
                className="block w-full text-center py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                View Profile
              </Link>
            </div>
            <nav className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {settingsNav.map((group) => (
                <div key={group.group}>
                  <p className="px-4 pt-4 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{group.group}</p>
                  {group.items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-rose-50 text-rose-700 border-r-2 border-rose-500'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                        }`}
                      >
                        <item.icon className="w-4 h-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>
          </aside>
          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
