'use client';

import SmartImage from '@/components/shared/smart-image';

import { useState, useEffect } from 'react';
import { Link } from '@/lib/router-compat';
import { motion } from 'framer-motion';
import {
  Heart, MessageCircle, Crown, Bell, Settings,
  UserPlus, Sparkles, MapPin, BadgeCheck, CheckCircle2,
  ArrowRight, Check, X, ShieldAlert, Eye, Lock, RefreshCw
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getInterests, getConversations, getProfiles, updateInterestStatus } from '../services/dataService';
import { fetchApi } from '../services/apiClient';
import { DashboardSkeleton } from '../components/SkeletonLoader';
import DailyUsageWidget from '@/components/member/daily-usage-widget';

const fieldLabels: Record<string, string> = {
  mobile_number: 'Mobile Number',
  gender: 'Gender',
  profile_created_by: 'Profile Created For',
  date_of_birth: 'Date of Birth',
  marital_status: 'Marital Status',
  height: 'Height',
  weight: 'Weight',
  religion: 'Religion',
  mother_tongue: 'Mother Tongue',
  highest_education: 'Education Details',
  occupation: 'Occupation',
  annual_income: 'Annual Income',
  work_location: 'Current City',
  photo: 'Profile Photo',
  about: 'About Me',
};

const mockVisitors = [
  { id: '1', name: 'Aakriti Sharma', age: 25, photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=120', city: 'Mumbai', time: '2 hours ago' },
  { id: '2', name: 'Priyanka Patel', age: 27, photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120', city: 'Pune', time: '5 hours ago' },
  { id: '3', name: 'Sneha Reddy', age: 26, photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120', city: 'Hyderabad', time: '1 day ago' },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [incomingInterests, setIncomingInterests] = useState<any[]>([]);
  const [suggestedProfiles, setSuggestedProfiles] = useState<any[]>([]);
  const [stats, setStats] = useState({
    receivedCount: 0,
    sentCount: 0,
    acceptedCount: 0,
    chatsCount: 0,
    unreadNotifications: 0,
  });
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    try {
      const [incoming, outgoing, conversations, notificationStats, profiles] = await Promise.all([
        getInterests('incoming').catch(() => []),
        getInterests('outgoing').catch(() => []),
        getConversations().catch(() => []),
        fetchApi<{ unread_count: number }>('/notifications/unread-count/').catch(() => ({ unread_count: 0 })),
        getProfiles().catch(() => ({ results: [] })),
      ]);

      const pendingIncoming = incoming.filter((i: any) => i.status === 'PENDING');
      setIncomingInterests(pendingIncoming);
      setSuggestedProfiles(profiles.results.slice(0, 6));

      const allInterests = [...incoming, ...outgoing];
      const accepted = allInterests.filter((i: any) => i.status === 'ACCEPTED').length;

      setStats({
        receivedCount: incoming.length,
        sentCount: outgoing.length,
        acceptedCount: accepted,
        chatsCount: conversations.length,
        unreadNotifications: notificationStats.unread_count,
      });
    } catch (err) {
      console.error('Failed to load dashboard statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleInterestAction = async (interestId: string, statusVal: 'ACCEPTED' | 'DECLINED') => {
    try {
      await updateInterestStatus(interestId, statusVal);
      await loadDashboardData();
    } catch (err) {
      console.error(`Failed to ${statusVal.toLowerCase()} interest:`, err);
    }
  };

  const completionPercentage = user?.completion_percentage ?? 0;
  const missingFields = user?.missing_fields ?? [];
  const profilePhoto = user?.photo || '/favicon.svg';
  const isPremium = user?.is_premium ?? false;

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-16 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <DashboardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Welcome Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-[var(--theme-primary-900)] via-[var(--theme-primary-800)] to-[var(--theme-primary-900)] p-8 sm:p-10 text-white shadow-2xl"
        >
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80&w=2069')] opacity-10 mix-blend-overlay object-cover" />
          <div className="absolute right-0 top-0 w-96 h-96 bg-white/10 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full border-4 border-white/20 overflow-hidden shadow-xl bg-gray-800 shrink-0">
                  <SmartImage src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                </div>
                {isPremium && (
                  <div className="absolute -bottom-2 -right-2 bg-gradient-to-r gradient-primary rounded-full p-1.5 shadow-lg border-2 border-[var(--theme-primary-900)]">
                    <Crown className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
              
              <div>
                <div className="flex flex-wrap gap-2 items-center mb-3">
                  <div className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold border border-white/10">
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    {isPremium ? 'Premium Partner' : 'Standard Member'}
                  </div>
                </div>
                <h1 className="text-3xl font-extrabold font-display leading-tight">
                  Welcome back, {user?.first_name || 'Member'} 👋
                </h1>
                <p className="text-white/70 mt-1">Ready to discover your matches today?</p>
              </div>
            </div>

            {/* Removed duplicate actions panel */}
          </div>
        </motion.div>

        {/* Dashboard grid columns */}
        <div className="grid lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-8">
            
            {/* 1. Statistics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { icon: UserPlus, label: 'Received', value: stats.receivedCount, color: 'text-rose-600 bg-rose-50' },
                { icon: Heart, label: 'Sent', value: stats.sentCount, color: 'text-indigo-600 bg-indigo-50' },
                { icon: CheckCircle2, label: 'Accepted', value: stats.acceptedCount, color: 'text-green-600 bg-green-50' },
                { icon: MessageCircle, label: 'Active Chats', value: stats.chatsCount, color: 'text-purple-600 bg-purple-50' },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white border border-gray-100 p-6 rounded-3xl flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${stat.color}`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <div className="text-2xl font-black text-slate-900 mb-1">{stat.value}</div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{stat.label}</div>
                </motion.div>
              ))}
            </div>

            {/* 2. Pending Interests */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold font-display text-slate-900">Recent Partner Interests</h3>
              </div>
              
              {incomingInterests.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-gray-100 shadow-sm text-center">
                  <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-4">
                    <Heart className="w-6 h-6" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900 mb-1">No pending interests yet</h4>
                  <p className="text-slate-500 text-sm max-w-sm mt-1">
                    Try uploading a professional profile photo or updating matching parameters to help more members discover you.
                  </p>
                  <Link to="/search" className="btn-primary mt-6 text-xs py-2 px-6">
                    Browse Matches
                  </Link>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-6">
                  {incomingInterests.slice(0, 4).map((interest, i) => {
                    const sender = interest.sender;
                    const senderPhoto = sender.photo || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300";
                    return (
                      <motion.div
                        key={interest.id}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 + (i * 0.05) }}
                        className="group relative overflow-hidden rounded-3xl bg-white shadow-md border border-slate-100"
                      >
                        <div className="aspect-[4/5] relative">
                          <SmartImage src={senderPhoto} alt={sender.full_name} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-gray-950/90 via-gray-950/20 to-transparent" />
                          
                          {sender.is_verified && (
                            <div className="absolute top-4 left-4 bg-gradient-to-r gradient-primary text-slate-900 text-[10px] font-extrabold px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                              <Crown className="w-3 h-3" /> VERIFIED
                            </div>
                          )}
                          
                          <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                            <h4 className="text-xl font-bold flex items-center gap-2">
                              {sender.first_name || 'Member'}, {sender.age || 'N/A'}
                              <BadgeCheck className="w-5 h-5 text-[var(--theme-primary-500)]" />
                            </h4>
                            
                            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-300 mt-1">
                              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {sender.work_location || 'India'}</span>
                              <span>â€¢</span>
                              <span>{sender.highest_education || 'Graduate'}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-3 w-full px-6 z-20">
                          <button type="button"
                            onClick={() => handleInterestAction(interest.id, 'DECLINED')}
                            className="flex-1 py-2.5 rounded-xl bg-white text-rose-600 font-extrabold shadow-lg hover:bg-rose-50 hover:scale-105 transition-all flex items-center justify-center gap-1 border border-rose-100 cursor-pointer"
                          >
                            <X className="w-4 h-4" /> Decline
                          </button>
                          <button type="button"
                            onClick={() => handleInterestAction(interest.id, 'ACCEPTED')}
                            className="flex-1 py-2.5 rounded-xl bg-[var(--theme-primary-600)] text-white font-extrabold shadow-lg hover:bg-[var(--theme-primary-700)] hover:scale-105 transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Check className="w-4 h-4" /> Accept
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. Six-photo match gallery */}
            <section className="rounded-[2rem] bg-white border border-gray-100 p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4 mb-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[var(--theme-primary-600)]">Discover</p>
                  <h3 className="text-xl font-bold font-display text-slate-900">Profiles picked for you</h3>
                </div>
                <Link to="/search" className="text-sm font-bold text-[var(--theme-primary-700)] hover:text-[var(--theme-primary-900)] inline-flex items-center gap-1">
                  See all <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              {suggestedProfiles.length ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {suggestedProfiles.map((profile) => (
                    <Link key={profile.id} to={`/profile/${profile.id}`} className="group relative aspect-[4/5] overflow-hidden rounded-2xl bg-slate-100">
                      <SmartImage src={profile.photo} alt={profile.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 to-transparent px-3 pb-3 pt-10 text-white">
                        <p className="font-bold text-sm truncate">{profile.name}, {profile.age || '—'}</p>
                        <p className="text-xs text-white/75 truncate">{profile.location || 'India'}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">Complete your profile to receive suggested matches.</div>
              )}
            </section>
          </div>

          <div className="space-y-8">
            <DailyUsageWidget />

            {/* Membership Status Widget */}
            <motion.div
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.12 }}
              className="bg-white p-6 rounded-[2rem] shadow-sm relative overflow-hidden border border-gray-100"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-rose-500/10 blur-2xl rounded-full -translate-y-1/2 translate-x-1/2" />
              
              <h3 className="font-bold font-display text-lg text-slate-900 mb-4 flex items-center gap-1.5">
                <Crown className="w-5 h-5 text-rose-500" /> Membership Usage
              </h3>
              
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold text-slate-500">Current Plan</span>
                  <span className="bg-gradient-to-r gradient-primary text-slate-900 font-extrabold text-[11px] px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                    {(user as any)?.active_membership?.plan_name || 'Free'}
                  </span>
                </div>
                
                <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-200/50">
                  <span className="font-semibold text-slate-500">Profiles Unlocked Today</span>
                  <span className="font-bold text-slate-950">
                    {((user as any)?.active_membership?.limits?.daily_views_used) ?? 0} of {((user as any)?.active_membership?.limits?.daily_views_limit) ?? 5}
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-200/50">
                  <span className="font-semibold text-slate-500">Remaining Today</span>
                  <span className="font-bold text-slate-950">
                    {Math.max(0, (((user as any)?.active_membership?.limits?.daily_views_limit) ?? 5) - (((user as any)?.active_membership?.limits?.daily_views_used) ?? 0))}
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-200/50">
                  <span className="font-semibold text-slate-500">Messaging</span>
                  <span className={`font-bold ${((user as any)?.active_membership?.plan_slug && (user as any)?.active_membership?.plan_slug !== 'free') ? 'text-green-600' : 'text-slate-500'}`}>
                    {((user as any)?.active_membership?.plan_slug && (user as any)?.active_membership?.plan_slug !== 'free') ? 'Included' : 'Not Included'}
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-200/50">
                  <span className="font-semibold text-slate-500">Next Reset</span>
                  <span className="font-medium text-slate-600">Tomorrow at 12:00 AM</span>
                </div>

                {((user as any)?.active_membership?.end_date) && (
                  <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-200/50">
                    <span className="font-semibold text-slate-500">Plan Expiry</span>
                    <span className="font-medium text-rose-500">
                      {new Date((user as any).active_membership.end_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
                
                {((user as any)?.pending_request) && (
                  <div className="bg-amber-50 text-amber-800 text-xs p-3 rounded-xl border border-amber-200 mt-2">
                    <strong>Pending Plan Request:</strong> {(user as any).pending_request.plan_name} (Awaiting Admin approval)
                  </div>
                )}

                {((user as any)?.pending_membership) && (
                  <div className="bg-amber-50 text-amber-800 text-xs p-3 rounded-xl border border-amber-200 mt-2">
                    <strong>Verification Pending:</strong> {(user as any).pending_membership.plan_name} (Active once verified)
                  </div>
                )}
              </div>

              <Link to="/membership" className="block text-center w-full py-3.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-all shadow-sm">
                View Plans & Entitlements
              </Link>
            </motion.div>

            {/* 3. Profile Completion & Strength Widget */}
            <motion.div
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white p-6 rounded-[2rem] shadow-sm relative overflow-hidden border border-gray-100"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[var(--theme-primary-500)]/10 to-[var(--theme-primary-400)]/10 blur-2xl rounded-full -translate-y-1/2 translate-x-1/2" />
              
              <h3 className="font-bold font-display text-lg text-slate-900 mb-6 flex items-center gap-1.5">
                <Sparkles className="w-5 h-5 text-amber-500" /> Profile Strength
              </h3>
              
              <div className="relative w-32 h-32 mx-auto mb-6">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="none" className="text-gray-100" />
                  <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="none" className="text-[var(--theme-primary-600)]" strokeDasharray="351.858" strokeDashoffset={351.858 * (1 - completionPercentage / 100)} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-slate-900">{completionPercentage}%</span>
                </div>
              </div>
              
              {missingFields.length > 0 ? (
                <div className="space-y-4 mb-6">
                  <div className="flex items-start gap-2.5 bg-amber-50 text-amber-800 text-xs p-3 rounded-2xl border border-amber-200/50">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <strong>Pending Fields Checklist</strong>
                      <p className="text-[11px] text-amber-700/90 mt-0.5">Reach 100% to qualify for verified matchmaking compatibility lists.</p>
                    </div>
                  </div>
                  
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">To Complete:</div>
                  <ul className="grid grid-cols-2 gap-2 text-xs text-slate-600 max-h-40 overflow-y-auto pr-1">
                    {missingFields.map((field: string) => (
                      <li key={field} className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                        <span className="truncate">{fieldLabels[field] || field}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="flex items-start gap-2.5 bg-green-50 text-green-800 text-xs p-3 rounded-2xl border border-green-200/50 mb-6">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <strong>100% Complete!</strong>
                    <p className="text-[11px] text-green-700 mt-0.5">Your profile parameters are fully integrated into our search indexes.</p>
                  </div>
                </div>
              )}
              
              <Link to="/settings" className="block text-center w-full py-3.5 rounded-xl btn-primary text-white font-bold text-sm hover:scale-[1.02] transition-all shadow-md">
                {missingFields.length > 0 ? 'Complete Profile' : 'Edit Profile Details'}
              </Link>
            </motion.div>

            {/* 4. Recent Profile Visitors Widget (Premium Matrimony Hook) */}
            <motion.div
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 relative overflow-hidden"
            >
              <h3 className="font-bold font-display text-lg text-slate-900 mb-4 flex items-center gap-1.5">
                <Eye className="w-5 h-5 text-indigo-500" /> Recent Visitors
              </h3>

              <div className="space-y-4">
                {mockVisitors.map((visitor) => (
                  <div key={visitor.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <SmartImage 
                          src={visitor.photo} 
                          alt="Visitor" 
                          className={`w-10 h-10 rounded-full object-cover border border-gray-100 ${!isPremium ? 'blur-[3px]' : ''}`} 
                        />
                        {!isPremium && (
                          <div className="absolute inset-0 bg-black/10 rounded-full flex items-center justify-center">
                            <Lock className="w-3.5 h-3.5 text-white shadow-sm" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">
                          {isPremium ? `${visitor.name}, ${visitor.age}` : 'Verified Partner'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {isPremium ? `${visitor.city} Â· ${visitor.time}` : `${visitor.time}`}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {!isPremium && (
                <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                  <p className="text-xs text-gray-500 mb-3">Upgrade to Premium to see who viewed your profile details.</p>
                  <Link 
                    to="/membership" 
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--theme-primary-700)] hover:text-[var(--theme-primary-900)] transition-colors"
                  >
                    Unlock Visitors <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </motion.div>

            {/* 5. Premium Upsell Card */}
            {!isPremium && (
              <motion.div
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 }}
                className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-gray-900 to-gray-800 p-8 text-white shadow-xl"
              >
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br gradient-primary opacity-20 blur-3xl rounded-full" />
                
                <Crown className="w-10 h-10 text-[var(--theme-primary-500)] mb-4" />
                <h3 className="text-xl font-extrabold font-display mb-2">Upgrade to Gold Tier</h3>
                <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                  Get priority compatibility matchmaking, send unlimited messages, and unlock contact details.
                </p>
                
                <Link to="/membership" className="inline-flex items-center justify-center w-full gap-2 py-3 bg-gradient-to-r gradient-primary text-slate-900 font-bold text-sm hover:opacity-95 transition-opacity rounded-xl shadow-lg">
                  Upgrade Now <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
