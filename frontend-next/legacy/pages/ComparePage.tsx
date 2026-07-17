// Side-by-Side Profile Comparison Page
'use client';

import { useState, useEffect, memo } from 'react';
import { Link, useSearchParams } from '@/lib/router-compat';
import { motion } from 'framer-motion';
import { Heart, Check, Star, Scale, User, ChevronDown, Sparkles } from 'lucide-react';
import { checkCompatibility, getProfile, getProfiles, getShortlists, sendInterest } from '../services/dataService';
import { fetchApi } from '../services/apiClient';
import type { Profile } from '../types/domain';
import SmartImage from '@/components/shared/smart-image';
import { getCompatibilityMatch, type MatchResponse } from '../services/matchmakingApi';

// Map a raw API user to Profile shape (same logic as dataService.ts profileFromWire)
function wireToProfile(user: any): Profile {
  return {
    id: user.id,
    name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Member',
    age: user.age || 0,
    height: user.height || 'Not specified',
    religion: user.religion || 'Not specified',
    caste: user.caste || 'Not specified',
    education: user.highest_education || 'Not specified',
    occupation: user.occupation || 'Not specified',
    income: user.annual_income || 'Not specified',
    location: user.work_location || 'Not specified',
    photo: user.photo || '/favicon.svg',
    verified: Boolean(user.is_verified),
    premium: Boolean(user.is_premium),
    compatibility: Number(user.compatibility_score || user.compatibility || 0),
    about: user.about || '',
    familyType: user.family_type || 'Not specified',
    motherTongue: user.mother_tongue || 'Not specified',
    maritalStatus: user.marital_status || 'Not specified',
    hobbies: Array.isArray(user.hobbies) ? user.hobbies : [],
    partnerPrefs: user.pref_about || 'Not specified',
    chat_public_key: user.chat_public_key,
    is_unlocked: true,
  };
}

const COMPARE_ROWS = [
  { key: 'age', label: 'Age', format: (v: any) => v ? `${v} years` : '—' },
  { key: 'height', label: 'Height' },
  { key: 'religion', label: 'Religion' },
  { key: 'caste', label: 'Caste' },
  { key: 'motherTongue', label: 'Mother Tongue' },
  { key: 'maritalStatus', label: 'Marital Status' },
  { key: 'education', label: 'Education' },
  { key: 'occupation', label: 'Occupation' },
  { key: 'income', label: 'Annual Income' },
  { key: 'location', label: 'Work City' },
  { key: 'familyType', label: 'Family Type' },
];

export default function ComparePage() {
  const [searchParams] = useSearchParams();
  const requestedCandidateId = searchParams.get('candidate');
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [shortlistedCandidates, setShortlistedCandidates] = useState<Profile[]>([]);
  const [profileB, setProfileB] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingInterest, setSendingInterest] = useState(false);
  const [interestSent, setInterestSent] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState<MatchResponse | null>(null);
  const [analysing, setAnalysing] = useState(false);

  const withCompatibility = async (profile: Profile | null | undefined) => {
    if (!profile) return null;
    try {
      const result = await checkCompatibility({ member_id: profile.id });
      return { ...profile, compatibility: Number(result.compatibility ?? profile.compatibility ?? 0) };
    } catch {
      return profile;
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        // Load my own profile from /member-auth/me/
        const me = await fetchApi<any>('/member-auth/me/');
        setMyProfile(wireToProfile(me));

        // Load shortlisted candidates
        // A shortlist is optional for comparison.  A temporary backend error
        // must not prevent a candidate opened directly from their profile.
        const sl = await getShortlists().catch(() => ({ count: 0, results: [] }));
        const shortlisted = sl.results || [];
        setShortlistedCandidates(shortlisted);

        const selected = requestedCandidateId
          ? shortlisted.find((profile) => profile.id === requestedCandidateId)
          : undefined;
        if (selected) {
          setProfileB(await withCompatibility(selected));
        } else {
          if (shortlisted.length > 0) setProfileB(await withCompatibility(shortlisted[0]));
        }
      } catch (err) {
        console.error('ComparePage init error', err);
        setLoadError('Profiles could not be loaded. Please refresh and try again.');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [requestedCandidateId]);

  const handleSelectB = async (id: string) => {
    setProfileB(await withCompatibility(shortlistedCandidates.find((p) => p.id === id)));
    setInterestSent(false);
  };

  const handleSendInterest = async () => {
    if (!profileB) return;
    setSendingInterest(true);
    try {
      await sendInterest(profileB.id);
      setInterestSent(true);
    } catch (err) {
      alert('Could not send interest. Please try again.');
    } finally {
      setSendingInterest(false);
    }
  };

  const isMatch = (valA: any, valB: any) => {
    if (!valA || !valB || valA === 'Not specified' || valB === 'Not specified') return false;
    return String(valA).trim().toLowerCase() === String(valB).trim().toLowerCase();
  };

  const activeCandidates = shortlistedCandidates;

  useEffect(() => {
    if (!myProfile || !profileB) return;
    let cancelled = false;
    setAnalysing(true);
    getCompatibilityMatch({
      p1_name: myProfile.name, p1_mbti: 'Not provided', p1_career: `${myProfile.occupation}; ${myProfile.education}`,
      p1_values: myProfile.hobbies?.join(', ') || myProfile.about,
      p2_name: profileB.name, p2_mbti: 'Not provided', p2_career: `${profileB.occupation}; ${profileB.education}`,
      p2_values: profileB.hobbies?.join(', ') || profileB.about,
    }).then((result) => { if (!cancelled) setAiAnalysis(result); })
      .catch(() => { if (!cancelled) setAiAnalysis(null); })
      .finally(() => { if (!cancelled) setAnalysing(false); });
    return () => { cancelled = true; };
  }, [myProfile, profileB]);

  if (loading) {
    return (
      <div className="min-h-screen pt-32 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-rose-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <main className="min-h-screen pt-24 pb-16 bg-gray-50/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

        {/* Header */}
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 border border-rose-100 px-4 py-1.5 text-xs font-bold uppercase text-rose-700 tracking-wider mb-4">
            <Scale className="w-4 h-4 text-rose-500" /> Comparison Deck
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight font-display">Compare: You vs. Candidate</h1>
          <p className="text-gray-500 text-sm mt-2">
            Your profile is always in Slot A. Pick any shortlisted or matched profile for Slot B.
          </p>
        </div>

        {/* Profile B Selection */}
        {loadError && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">{loadError}</div>}
        <section className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Compare With</label>
              <div className="flex gap-2 mb-3">
                <span className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500 text-white">❤️ My Shortlist ({shortlistedCandidates.length})</span>
              </div>
              {activeCandidates.length === 0 ? (
                <p className="text-gray-400 text-sm italic py-3">
                  No shortlisted profiles yet. Open a profile and click Shortlist before comparing.
                </p>
              ) : (
                <select
                  value={profileB?.id ?? ''}
                  onChange={(e) => handleSelectB(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-2xl text-sm font-semibold focus:outline-none focus:border-rose-300 transition-colors"
                >
                  <option value="">Select a candidate...</option>
                  {activeCandidates.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.age}, {p.location}) — {p.occupation}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {profileB && (
              <button
                onClick={handleSendInterest}
                disabled={sendingInterest || interestSent}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all ${
                  interestSent
                    ? 'bg-green-100 text-green-700 border border-green-200 cursor-default'
                    : 'bg-gradient-to-r from-rose-500 to-pink-600 text-white hover:from-rose-600 hover:to-pink-700 shadow-lg shadow-rose-200'
                }`}
              >
                {interestSent ? <><Check className="w-4 h-4" /> Interest Sent!</> : sendingInterest ? 'Sending...' : <><Heart className="w-4 h-4 fill-white" /> Send Interest</>}
              </button>
            )}
          </div>
        </section>

        {/* Comparison Cards */}
        {myProfile && profileB ? (
          <>
            {/* Profile Photos Header */}
            <div className="grid grid-cols-2 gap-6">
              {[{ profile: myProfile, label: 'You (My Profile)', isMe: true }, { profile: profileB, label: 'Candidate', isMe: false }].map(({ profile, label, isMe }) => (
                <motion.div
                  key={profile.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <SmartImage src={profile.photo} alt={profile.name} className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-5">
                      <div className="text-white">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-1">{label}</div>
                        <div className="font-black text-lg">{profile.name}, {profile.age}</div>
                        <div className="text-sm text-white/80">{profile.occupation} • {profile.location}</div>
                      </div>
                    </div>
                    {isMe && (
                      <div className="absolute top-3 left-3 bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg">
                        You
                      </div>
                    )}
                    {!isMe && profile.compatibility > 0 && (
                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-black text-rose-500 flex items-center gap-1">
                        <Star className="w-3 h-3 fill-rose-500 stroke-none" /> {profile.compatibility}%
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Comparison Table */}
            <section className="rounded-3xl border border-rose-100 bg-gradient-to-r from-rose-50 via-white to-amber-50 p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-rose-600">Gemini AI insights</p>
                  <h2 className="mt-1 text-xl font-black text-slate-900">{analysing ? 'Analysing your shared preferences…' : `${aiAnalysis?.total_score ?? profileB.compatibility}% compatibility`}</h2>
                </div>
                <Sparkles className={`h-6 w-6 text-rose-500 ${analysing ? 'animate-pulse' : ''}`} />
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{aiAnalysis?.conclusion || 'Select a profile to receive a personalised, preference-based comparison.'}</p>
              {aiAnalysis?.dimensions?.length ? <div className="mt-4 grid gap-2 sm:grid-cols-2">{aiAnalysis.dimensions.map((dimension) => <div key={dimension.name} className="rounded-xl bg-white/80 px-3 py-2 text-xs text-slate-600"><b className="text-slate-800">{dimension.name}: {dimension.score}/{dimension.max_score}</b><br />{dimension.insight}</div>)}</div> : null}
            </section>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_1fr] bg-gradient-to-r from-rose-50 via-white to-blue-50 border-b border-gray-100 px-6 py-4">
                <div className="text-sm font-black text-rose-700 text-right pr-6">{myProfile.name}</div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider text-center px-4 self-center">FIELD</div>
                <div className="text-sm font-black text-blue-700 pl-6">{profileB.name}</div>
              </div>

              {COMPARE_ROWS.map((row, i) => {
                const valA = (myProfile as any)[row.key];
                const valB = (profileB as any)[row.key];
                const matched = isMatch(valA, valB);
                const displayA = row.format ? row.format(valA) : (valA || '—');
                const displayB = row.format ? row.format(valB) : (valB || '—');

                return (
                  <div
                    key={row.key}
                    className={`grid grid-cols-[1fr_auto_1fr] px-6 py-4 border-b border-gray-50 last:border-0 transition-colors ${matched ? 'bg-green-50/60' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}
                  >
                    <div className={`text-sm text-right pr-6 font-semibold ${matched ? 'text-green-700' : 'text-gray-700'}`}>
                      {displayA}
                    </div>
                    <div className="flex flex-col items-center gap-1 px-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 text-center whitespace-nowrap">{row.label}</span>
                      {matched && <Check className="w-4 h-4 text-green-500" />}
                    </div>
                    <div className={`text-sm pl-6 font-semibold ${matched ? 'text-green-700' : 'text-gray-700'}`}>
                      {displayB}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Hobbies comparison */}
            <div className="grid grid-cols-2 gap-6">
              {[{ profile: myProfile, color: 'rose' }, { profile: profileB, color: 'blue' }].map(({ profile, color }) => (
                <div key={profile.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">{profile.name}'s Hobbies</h3>
                  {profile.hobbies && profile.hobbies.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {profile.hobbies.map((h, index) => (
                        <span key={`${profile.id}-${h}-${index}`} className={`px-3 py-1 rounded-full text-xs font-bold ${
                          profileB.hobbies?.includes(h) || myProfile.hobbies?.includes(h)
                            ? 'bg-green-100 text-green-700 border border-green-200'
                            : `bg-${color}-50 text-${color}-700 border border-${color}-100`
                        }`}>
                          {h}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm">No hobbies listed.</p>
                  )}
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="text-center pb-4">
              <Link
                to={`/profile/${profileB.id}`}
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold rounded-2xl hover:from-rose-600 hover:to-pink-700 shadow-lg shadow-rose-200 transition-all"
              >
                View Full Profile of {profileB.name}
              </Link>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 text-center">
            <User className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-semibold">Select a candidate above to begin comparison.</p>
          </div>
        )}
      </div>
    </main>
  );
}
