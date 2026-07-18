'use client';

import SmartImage from '@/components/shared/smart-image';

import { useState, useEffect } from 'react';
import { Link } from '@/lib/router-compat';
import { motion } from 'framer-motion';
import {
  Heart, MessageCircle, Crown, Bell, Settings,
  UserPlus, MapPin, BadgeCheck, CheckCircle2,
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

interface ProfileVisitor {
  id: string;
  viewed_at: string;
  profile: { full_name?: string; age?: number; photo?: string; work_location?: string };
}

interface ProfileVisitorsResponse {
  can_view_visitors: boolean;
  total_unique_visitors: number;
  results: ProfileVisitor[];
}

function relativeTime(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [incomingInterests, setIncomingInterests] = useState<any[]>([]);
  const [suggestedProfiles, setSuggestedProfiles] = useState<any[]>([]);
  const [visitors, setVisitors] = useState<ProfileVisitor[]>([]);
  const [canViewVisitors, setCanViewVisitors] = useState(false);
  const [visitorCount, setVisitorCount] = useState(0);
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
      const [incoming, outgoing, conversations, notificationStats, profiles, visitorData] = await Promise.all([
        getInterests('incoming').catch(() => []),
        getInterests('outgoing').catch(() => []),
        getConversations().catch(() => []),
        fetchApi<{ unread_count: number }>('/notifications/unread-count/').catch(() => ({ unread_count: 0 })),
        getProfiles().catch(() => ({ results: [] })),
        fetchApi<ProfileVisitorsResponse>('/profile-visitors/', { params: { limit: 3 } })
          .catch(() => ({ can_view_visitors: false, total_unique_visitors: 0, results: [] })),
      ]);

      const pendingIncoming = incoming.filter((i: any) => i.status === 'PENDING');
      setIncomingInterests(pendingIncoming);
      setSuggestedProfiles(profiles.results.slice(0, 6));
      setVisitors(visitorData.results);
      setCanViewVisitors(visitorData.can_view_visitors);
      setVisitorCount(visitorData.total_unique_visitors);

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
    <div className="min-h-screen pt-28 pb-20 bg-[#faf6f0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Welcome Banner */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#2b101d] via-[#4a162b] to-[#1c0612] p-8 sm:p-12 text-white shadow-[0_20px_50px_rgba(43,16,29,0.25)] border border-white/5"
        >
          {/* Subtle grid pattern overlay */}
          <div className="absolute inset-0 bg-grid-white/[0.02] mix-blend-overlay" />
          {/* Ambient glowing radial balls */}
          <div className="absolute right-0 top-0 w-96 h-96 bg-[var(--gold-400)]/10 blur-[120px] rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none" />
          <div className="absolute left-10 bottom-0 w-72 h-72 bg-[var(--rose-400)]/10 blur-[100px] rounded-full -translate-x-1/3 translate-y-1/3 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
              <div className="relative group">
                <div className="w-28 h-28 rounded-full border-4 border-[var(--gold-400)]/30 overflow-hidden shadow-2xl bg-[#160910] shrink-0 transition-transform duration-300 group-hover:scale-105">
                  <SmartImage src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                </div>
                {isPremium ? (
                  <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-[var(--gold-400)] to-[var(--gold-500)] rounded-full p-2 shadow-lg border-2 border-[#2b101d] animate-bounce">
                    <Crown className="w-4 h-4 text-[#2b101d]" />
                  </div>
                ) : (
                  <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-[var(--rose-500)] to-[#4a162b] rounded-full p-2 shadow-lg border-2 border-[#2b101d]">
                    <Heart className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex flex-wrap justify-center sm:justify-start gap-2 items-center">
                  <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold border border-white/10 tracking-wide text-[var(--gold-300)]">
                    {isPremium ? <Crown className="w-3.5 h-3.5 text-[var(--gold-400)]" /> : <Heart className="w-3.5 h-3.5 text-[var(--rose-300)]" />}
                    {isPremium ? 'Premium Gold Partner' : 'Standard Member'}
                  </div>
                </div>
                <h1 className="text-3xl sm:text-4.5xl font-black font-display leading-tight tracking-tight text-white">
                  Welcome back, {user?.first_name || 'Member'} 👋
                </h1>
                <p className="text-white/60 text-sm max-w-md">
                  Ready to discover new matches? Complete checklist items to maximize discoverability.
                </p>
              </div>
            </div>
            
            <div className="shrink-0 flex gap-3">
              <Link to="/search" className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[var(--gold-400)] to-[var(--gold-500)] text-[#2b101d] font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-[var(--gold-500)]/20 hover:scale-[1.03]">
                Discover Matches
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Dashboard grid columns */}
        <div className="grid lg:grid-cols-3 gap-10">
          
          {/* Main Content (Left Column) */}
          <div className="lg:col-span-2 space-y-10">
            
            {/* 1. Statistics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
              {[
                { icon: UserPlus, label: 'Received', value: stats.receivedCount, color: 'text-[var(--rose-500)] bg-[var(--rose-300)]/10 border-[var(--rose-500)]/10' },
                { icon: Heart, label: 'Sent', value: stats.sentCount, color: 'text-indigo-600 bg-indigo-50/50 border-indigo-100' },
                { icon: CheckCircle2, label: 'Accepted', value: stats.acceptedCount, color: 'text-emerald-600 bg-emerald-50/50 border-emerald-100' },
                { icon: MessageCircle, label: 'Chats', value: stats.chatsCount, color: 'text-amber-600 bg-amber-50/50 border-amber-100' },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white border border-gray-100 p-6 rounded-3xl flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300"
                >
                  <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center mb-4 ${stat.color} shrink-0`}>
                    <stat.icon className="w-5.5 h-5.5" />
                  </div>
                  <div className="text-3xl font-black text-slate-900 mb-1">{stat.value}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</div>
                </motion.div>
              ))}
            </div>

            {/* 2. Pending Interests */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold font-display text-slate-900">Recent Partner Interests</h3>
              </div>
              
              {incomingInterests.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 bg-white rounded-[2rem] border border-gray-100/80 shadow-sm text-center">
                  <div className="w-16 h-16 bg-[var(--rose-300)]/10 text-[var(--rose-500)] rounded-full flex items-center justify-center mb-4 border border-[var(--rose-500)]/10">
                    <Heart className="w-8 h-8" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900 mb-1">No pending interests yet</h4>
                  <p className="text-slate-500 text-sm max-w-sm mt-1">
                    Try uploading a professional profile photo or updating matching parameters to help more members discover you.
                  </p>
                  <Link to="/search" className="mt-6 px-6 py-2.5 rounded-xl border border-[var(--rose-500)]/20 text-[var(--rose-500)] font-bold text-xs hover:bg-[var(--rose-300)]/5 transition-all">
                    Browse Matches
                  </Link>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-6">
                  {incomingInterests.slice(0, 4).map((interest, i) => {
                    const sender = interest.sender;
                    const senderPhoto = sender.photo || '';
                    return (
                      <motion.div
                        key={interest.id}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 + (i * 0.05) }}
                        className="group relative overflow-hidden rounded-[2rem] bg-white shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100/80"
                      >
                        <div className="aspect-[4/5] relative overflow-hidden">
                          <SmartImage src={senderPhoto} alt={sender.full_name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                          <div className="absolute inset-0 bg-gradient-to-t from-gray-950/90 via-gray-950/20 to-transparent" />
                          
                          {sender.is_verified && (
                            <div className="absolute top-4 left-4 bg-gradient-to-r from-[var(--gold-400)] to-[var(--gold-500)] text-[#2b101d] text-[10px] font-black px-3.5 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                              <Crown className="w-3.5 h-3.5" /> VERIFIED
                            </div>
                          )}
                          
                          <div className="absolute bottom-0 left-0 right-0 p-6 text-white z-10">
                            <h4 className="text-xl font-bold flex items-center gap-1.5">
                              {sender.first_name || 'Member'}, {sender.age || 'N/A'}
                              <BadgeCheck className="w-5.5 h-5.5 text-emerald-400" />
                            </h4>
                            
                            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-300 mt-1">
                              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-[var(--gold-400)]" /> {sender.work_location || 'India'}</span>
                              <span>•</span>
                              <span>{sender.highest_education || 'Graduate'}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-3 w-full px-6 z-20">
                          <button type="button"
                            onClick={() => handleInterestAction(interest.id, 'DECLINED')}
                            className="flex-1 py-3 rounded-2xl bg-white text-[var(--rose-500)] font-extrabold shadow-lg hover:bg-rose-50/50 hover:scale-105 transition-all flex items-center justify-center gap-1.5 border border-rose-100 cursor-pointer"
                          >
                            <X className="w-4.5 h-4.5" /> Decline
                          </button>
                          <button type="button"
                            onClick={() => handleInterestAction(interest.id, 'ACCEPTED')}
                            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-[var(--rose-500)] to-[#4a162b] text-white font-extrabold shadow-lg hover:opacity-95 hover:scale-105 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Check className="w-4.5 h-4.5" /> Accept
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. Match Gallery */}
            <section className="rounded-[2.5rem] bg-white border border-gray-100 p-6 sm:p-8 shadow-sm">
              <div className="flex items-center justify-between gap-4 mb-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[var(--rose-500)]">Curated Picks</p>
                  <h3 className="text-xl font-bold font-display text-slate-900 mt-1">Recommended Compatibility matches</h3>
                </div>
                <Link to="/search" className="text-sm font-bold text-[var(--rose-500)] hover:text-[var(--rose-600)] inline-flex items-center gap-1 group">
                  See all <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
              
              {suggestedProfiles.length ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                  {suggestedProfiles.map((profile) => (
                    <Link key={profile.id} to={`/profile/${profile.id}`} className="group relative aspect-[4/5] overflow-hidden rounded-2xl bg-slate-100 shadow-sm border border-slate-100/50 block">
                      <SmartImage src={profile.photo} alt={profile.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      {profile.photoVisibility === 'pending_approval' ? (
                        <div className="absolute inset-x-3 top-3 rounded-lg bg-amber-100/95 px-3 py-2 text-center text-[10px] font-bold text-amber-950 shadow-sm">
                          Photo pending approval
                        </div>
                      ) : null}
                      
                      {profile.compatibility > 0 && (
                        <div className="absolute top-3 right-3 bg-[#2b101d]/85 backdrop-blur-sm text-[var(--gold-400)] text-[10px] font-black px-2 py-1 rounded-md border border-[var(--gold-400)]/20 shadow-lg">
                          {profile.compatibility}% Match
                        </div>
                      )}
                      
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/95 via-slate-950/45 to-transparent px-4 pb-4 pt-12 text-white z-10">
                        <p className="font-bold text-sm truncate">{profile.name}, {profile.age || '—'}</p>
                        <p className="text-[11px] text-white/60 truncate mt-0.5">{profile.location || 'India'}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">Complete your profile checklist to unlock compatibility matches.</div>
              )}
            </section>
          </div>

          {/* Sidebar / Context panel (Right Column) */}
          <div className="space-y-10">
            <DailyUsageWidget />

            {/* Membership Status Widget */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.12 }}
              className="bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-sm relative overflow-hidden border border-gray-100"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[var(--rose-400)]/5 to-[var(--gold-400)]/5 blur-2xl rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              
              <h3 className="font-bold font-display text-lg text-slate-900 mb-5 flex items-center gap-2">
                <Crown className="w-5 h-5 text-[var(--gold-500)]" /> Membership Status
              </h3>
              
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 mb-6 space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider">Plan Name</span>
                  <span className="bg-gradient-to-r from-[var(--gold-400)] to-[var(--gold-500)] text-[#2b101d] font-black text-[10px] px-3.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                    {(user as any)?.active_membership?.plan_name || 'Free Tier'}
                  </span>
                </div>
                
                <div className="flex justify-between items-center text-sm pt-3 border-t border-slate-200/50">
                  <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider">Daily Unlocks</span>
                  <span className="font-bold text-slate-900">
                    {((user as any)?.active_membership?.limits?.daily_views_used) ?? 0} / {((user as any)?.active_membership?.limits?.daily_views_limit) ?? 5}
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm pt-3 border-t border-slate-200/50">
                  <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider">Remaining today</span>
                  <span className="font-black text-[var(--rose-500)]">
                    {Math.max(0, (((user as any)?.active_membership?.limits?.daily_views_limit) ?? 5) - (((user as any)?.active_membership?.limits?.daily_views_used) ?? 0))} unlocks
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm pt-3 border-t border-slate-200/50">
                  <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider">Direct messaging</span>
                  <span className={`font-extrabold text-xs uppercase ${((user as any)?.active_membership?.plan_slug && (user as any)?.active_membership?.plan_slug !== 'free') ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {((user as any)?.active_membership?.plan_slug && (user as any)?.active_membership?.plan_slug !== 'free') ? 'Enabled' : 'Locked'}
                  </span>
                </div>
                
                {((user as any)?.active_membership?.end_date) && (
                  <div className="flex justify-between items-center text-sm pt-3 border-t border-slate-200/50">
                    <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider">Valid Till</span>
                    <span className="font-semibold text-slate-700">
                      {new Date((user as any).active_membership.end_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
                
                {((user as any)?.pending_request) && (
                  <div className="bg-amber-50 text-amber-950 text-xs p-3.5 rounded-xl border border-amber-200/50 mt-2">
                    <strong>Pending Upgrade:</strong> {(user as any).pending_request.plan_name} (Awaiting confirmation)
                  </div>
                )}
              </div>

              <Link to="/membership" className="block text-center w-full py-4 rounded-2xl border border-slate-200 text-slate-700 font-extrabold text-sm hover:bg-slate-50 transition-all shadow-sm">
                View Plan Options
              </Link>
            </motion.div>

            {/* 3. Profile Completion & Strength Widget */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-sm relative overflow-hidden border border-gray-100"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#8e3d58]/5 to-[var(--gold-400)]/5 blur-2xl rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              
              <h3 className="font-bold font-display text-lg text-slate-900 mb-6 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-amber-500" /> Profile Strength
              </h3>
              
              <div className="relative w-36 h-36 mx-auto mb-6">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="72" cy="72" r="64" stroke="currentColor" strokeWidth="8" fill="none" className="text-slate-100" />
                  <circle cx="72" cy="72" r="64" stroke="currentColor" strokeWidth="8" fill="none" className="text-[var(--rose-500)]" strokeDasharray="402.12" strokeDashoffset={402.12 * (1 - completionPercentage / 100)} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3.5xl font-black text-slate-900">{completionPercentage}%</span>
                </div>
              </div>
              
              {missingFields.length > 0 ? (
                <div className="space-y-4 mb-6">
                  <div className="flex items-start gap-2.5 bg-amber-50 text-amber-800 text-xs p-3.5 rounded-2xl border border-amber-200/50">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                    <div>
                      <strong>Checklist Remaining</strong>
                      <p className="text-[11px] text-amber-700/90 mt-0.5">Reach 100% to qualify for compatibility listings.</p>
                    </div>
                  </div>
                  
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Remaining fields:</div>
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
                <div className="flex items-start gap-2.5 bg-green-50 text-green-800 text-xs p-3.5 rounded-2xl border border-green-200/50 mb-6">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-green-600" />
                  <div>
                    <strong>100% Verified!</strong>
                    <p className="text-[11px] text-green-700 mt-0.5">Your matching indices are fully built and active.</p>
                  </div>
                </div>
              )}
              
              <Link to="/settings" className="block text-center w-full py-4 rounded-2xl bg-gradient-to-r from-[var(--rose-500)] to-[#4a162b] text-white font-extrabold text-sm hover:opacity-95 transition-all shadow-md hover:scale-[1.02]">
                {missingFields.length > 0 ? 'Complete Profile Info' : 'Edit Profile Parameters'}
              </Link>
            </motion.div>

            {/* 4. Recent Profile Visitors Widget */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-sm border border-gray-100 relative overflow-hidden"
            >
              <h3 className="font-bold font-display text-lg text-slate-900 mb-5 flex items-center gap-2">
                <Eye className="w-5 h-5 text-indigo-500" /> Recent Profile Visitors
              </h3>

              <div className="space-y-4">
                {canViewVisitors && visitors.map((visitor) => (
                  <div key={visitor.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <SmartImage 
                          src={visitor.profile.photo} 
                          alt="Visitor" 
                          className="w-11 h-11 rounded-full object-cover border border-gray-100"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          {visitor.profile.full_name || 'Member'}{visitor.profile.age ? `, ${visitor.profile.age}` : ''}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {visitor.profile.work_location || 'Location private'} · {relativeTime(visitor.viewed_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {canViewVisitors && visitors.length === 0 ? <p className="py-4 text-center text-sm text-slate-400 italic">No one has viewed your profile yet.</p> : null}
                {!canViewVisitors && visitorCount > 0 ? <p className="py-2 text-center text-sm text-slate-500 font-semibold">{visitorCount} verified {visitorCount === 1 ? 'member' : 'members'} viewed your profile.</p> : null}
                {!canViewVisitors && visitorCount === 0 ? <p className="py-4 text-center text-sm text-slate-400 italic">No profile views recorded.</p> : null}
              </div>

              {!canViewVisitors && visitorCount > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                  <p className="text-xs text-slate-400 mb-4">Upgrade to Gold Tier to unlock full visitor identities.</p>
                  <Link 
                    to="/membership" 
                    className="inline-flex items-center gap-1 text-xs font-black text-[var(--rose-500)] hover:text-[var(--rose-600)] transition-colors group"
                  >
                    Unlock Visitors <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              )}
            </motion.div>

            {/* 5. Premium Upsell Card */}
            {!isPremium && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 }}
                className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#2b101d] via-[#4a162b] to-[#1c0612] p-8 text-white shadow-xl border border-white/5"
              >
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-[var(--gold-400)]/20 to-[var(--gold-500)]/20 opacity-30 blur-3xl rounded-full pointer-events-none" />
                
                <Crown className="w-12 h-12 text-[var(--gold-400)] mb-4 animate-pulse" />
                <h3 className="text-xl font-black font-display mb-2 text-white">Upgrade to Premium Gold</h3>
                <p className="text-xs text-white/60 mb-6 leading-relaxed">
                  Send unlimited messages, view direct contact numbers, unlock full compatibility analysis reports, and browse anonymously.
                </p>
                
                <Link to="/membership" className="inline-flex items-center justify-center w-full gap-2 py-4 bg-gradient-to-r from-[var(--gold-400)] to-[var(--gold-500)] text-[#2b101d] font-black text-sm hover:opacity-95 transition-opacity rounded-2xl shadow-lg">
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
