'use client';

import SmartImage from '@/components/shared/smart-image';
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useSearchParams } from '@/lib/router-compat';
import {
  Heart, MessageCircle, MapPin, ShieldCheck, User, Star, Crown, Search, SlidersHorizontal, RefreshCw, Lock,
} from 'lucide-react';
import type { Profile } from '../types/domain';
import { getProfiles, sendInterest } from '../services/dataService';
import { useAuth } from '../contexts/AuthContext';
import { usePresence } from '../../hooks/use-presence';
import { useMembership } from '@/components/member/membership-provider';
import UpgradeModal from '@/components/member/upgrade-modal';

export default function SearchPage() {
  const { user } = useAuth();
  const { membershipSummary } = useMembership();
  const canUseAdvancedSearch = membershipSummary?.can_use_advanced_search ?? true;
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [searchParams] = useSearchParams();
  const [profilesList, setProfilesList] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const PAGE_SIZE = 12;

  // Live presence for the profiles currently visible in search results. We only
  // query the ids on screen via POST /api/v1/presence/bulk/ and patch from
  // presence.changed WS events — no global online/offline firehose.
  const visibleProfileIds = useMemo(
    () => profilesList.map((p) => p.id),
    [profilesList],
  );
  const { isOnline } = usePresence(visibleProfileIds);

  // Filter States
  const [keyword, setKeyword] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [religionFilter, setReligionFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [maritalStatusFilter, setMaritalStatusFilter] = useState('');
  const [motherTongueFilter, setMotherTongueFilter] = useState('');
  const [educationFilter, setEducationFilter] = useState('');
  const [casteFilter, setCasteFilter] = useState('');

  const loadProfiles = async (customParams?: Record<string, string>, page = 1, append = false) => {
    if (page === 1) setLoading(true);
    else setLoadingMore(true);
    setError('');
    try {
      const params: Record<string, string> = { ...customParams, page: String(page), page_size: String(PAGE_SIZE) };
      if (keyword) params.search = keyword;
      if (genderFilter) params.gender = genderFilter;
      if (religionFilter) params.religion = religionFilter;
      if (locationFilter) params.work_location = locationFilter;
      if (ageMin) params.age_min = ageMin;
      if (ageMax) params.age_max = ageMax;
      if (maritalStatusFilter) params.marital_status = maritalStatusFilter;
      if (motherTongueFilter) params.mother_tongue = motherTongueFilter;
      if (educationFilter) params.highest_education = educationFilter;
      if (casteFilter) params.caste = casteFilter;

      const data = await getProfiles(params);
      const results = data.results || [];
      setProfilesList((prev) => append ? [...prev, ...results] : results);
      setTotalCount((data as any).count || results.length);
      setHasMore((data as any).next !== null);
      setCurrentPage(page);
    } catch (err: any) {
      setError(err?.message || 'Failed to load matching profiles.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Initial load from search query params if present
  useEffect(() => {
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key === 'q' ? 'search' : key] = value;
      if (key === 'q') setKeyword(value);
      else if (key === 'gender') setGenderFilter(value);
      else if (key === 'religion') setReligionFilter(value);
      else if (key === 'work_location') setLocationFilter(value);
      else if (key === 'age_min') setAgeMin(value);
      else if (key === 'age_max') setAgeMax(value);
      else if (key === 'marital_status') setMaritalStatusFilter(value);
      else if (key === 'mother_tongue') setMotherTongueFilter(value);
      else if (key === 'highest_education') setEducationFilter(value);
      else if (key === 'caste') setCasteFilter(value);
    });
    loadProfiles(params);
  }, [searchParams]);

  const expressInterest = async (id: string) => {
    setBusyId(id);
    try {
      await sendInterest(id);
      alert('Interest sent successfully!');
    } catch (err: any) {
      alert(err instanceof Error ? err.message : 'Interest could not be sent.');
    } finally {
      setBusyId('');
    }
  };

  const handleResetFilters = () => {
    setKeyword('');
    setGenderFilter('');
    setReligionFilter('');
    setLocationFilter('');
    setAgeMin('');
    setAgeMax('');
    setMaritalStatusFilter('');
    setMotherTongueFilter('');
    setEducationFilter('');
    setCasteFilter('');
    setCurrentPage(1);
    loadProfiles({}, 1, false);
  };

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadProfiles(undefined, 1, false);
  };

  const handleLoadMore = () => {
    loadProfiles(undefined, currentPage + 1, true);
  };

  return (
    <div className="min-h-screen pt-24 pb-16 bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 font-display">Discover Matches</h1>
          <p className="text-sm text-slate-500 mt-1">Browse members matches based on your compatibility preferences.</p>
        </div>

        <div className="grid lg:grid-cols-[280px_1fr] gap-8 items-start">
          {/* Sidebar Filters */}
          <motion.div
            initial={{ opacity: 0, x: -25 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm sticky top-24 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <SlidersHorizontal className="w-4 h-4 text-rose-500" />
                <span>Search Filters</span>
              </div>
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1 transition-all"
              >
                <RefreshCw className="w-3 h-3" /> Reset
              </button>
            </div>

            <form onSubmit={handleApplyFilters} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Keyword Search</label>
                <div className="relative">
                  <input
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="Search name, job..."
                    className="w-full bg-slate-50 border border-slate-100 focus:border-rose-200 focus:outline-none rounded-xl text-xs py-2.5 pl-8 pr-3 text-slate-800 transition-all placeholder-slate-400 font-semibold"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Gender</label>
                <select
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 focus:border-rose-200 focus:outline-none rounded-xl text-xs py-2.5 px-3 text-slate-800 font-semibold cursor-pointer transition-all"
                >
                  <option value="">Opposite Gender (Default)</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="all">Universal (Show All)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Marital Status</label>
                <select
                  value={maritalStatusFilter}
                  onChange={(e) => setMaritalStatusFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 focus:border-rose-200 focus:outline-none rounded-xl text-xs py-2.5 px-3 text-slate-800 font-semibold cursor-pointer transition-all"
                >
                  <option value="">Any Status</option>
                  <option value="Never Married">Never Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                  <option value="Awaiting Divorced">Awaiting Divorced</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Religion</label>
                <input
                  type="text"
                  value={religionFilter}
                  onChange={(e) => setReligionFilter(e.target.value)}
                  placeholder="e.g. Hindu, Muslim, Christian"
                  className="w-full bg-slate-50 border border-slate-100 focus:border-rose-200 focus:outline-none rounded-xl text-xs py-2.5 px-3 text-slate-800 font-semibold transition-all placeholder-slate-400"
                />
              </div>

                {/* Advanced Filters - locked for free users */}
              <div className="relative">
                {/* Caste */}
                <div className={!canUseAdvancedSearch ? 'opacity-40 pointer-events-none select-none' : ''}>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Caste</label>
                    <input
                      type="text"
                      value={casteFilter}
                      onChange={(e) => setCasteFilter(e.target.value)}
                      placeholder="e.g. Nair, General, Brahmin"
                      className="w-full bg-slate-50 border border-slate-100 focus:border-rose-200 focus:outline-none rounded-xl text-xs py-2.5 px-3 text-slate-800 font-semibold transition-all placeholder-slate-400"
                    />
                  </div>

                  <div className="mt-4">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Mother Tongue</label>
                    <input
                      type="text"
                      value={motherTongueFilter}
                      onChange={(e) => setMotherTongueFilter(e.target.value)}
                      placeholder="e.g. Hindi, Punjabi, Tamil"
                      className="w-full bg-slate-50 border border-slate-100 focus:border-rose-200 focus:outline-none rounded-xl text-xs py-2.5 px-3 text-slate-800 font-semibold transition-all placeholder-slate-400"
                    />
                  </div>

                  <div className="mt-4">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Education</label>
                    <input
                      type="text"
                      value={educationFilter}
                      onChange={(e) => setEducationFilter(e.target.value)}
                      placeholder="e.g. B.Tech, MBA, MBBS"
                      className="w-full bg-slate-50 border border-slate-100 focus:border-rose-200 focus:outline-none rounded-xl text-xs py-2.5 px-3 text-slate-800 font-semibold transition-all placeholder-slate-400"
                    />
                  </div>

                  <div className="mt-4">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Work Location</label>
                    <input
                      type="text"
                      value={locationFilter}
                      onChange={(e) => setLocationFilter(e.target.value)}
                      placeholder="e.g. Mumbai, Bangalore"
                      className="w-full bg-slate-50 border border-slate-100 focus:border-rose-200 focus:outline-none rounded-xl text-xs py-2.5 px-3 text-slate-800 font-semibold transition-all placeholder-slate-400"
                    />
                  </div>

                  <div className="mt-4">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-display font-bold">Age Range</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        value={ageMin}
                        onChange={(e) => setAgeMin(e.target.value)}
                        placeholder="Min"
                        min="18"
                        className="w-full bg-slate-50 border border-slate-100 focus:border-rose-200 focus:outline-none rounded-xl text-xs py-2.5 px-3 text-slate-800 font-semibold transition-all placeholder-slate-400"
                      />
                      <input
                        type="number"
                        value={ageMax}
                        onChange={(e) => setAgeMax(e.target.value)}
                        placeholder="Max"
                        className="w-full bg-slate-50 border border-slate-100 focus:border-rose-200 focus:outline-none rounded-xl text-xs py-2.5 px-3 text-slate-800 font-semibold transition-all placeholder-slate-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Lock overlay for free users */}
                {!canUseAdvancedSearch && (
                  <button
                    type="button"
                    onClick={() => setShowUpgradeModal(true)}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/70 backdrop-blur-[2px] rounded-2xl transition-all hover:bg-white/80"
                  >
                    <Lock className="w-5 h-5 text-rose-400" />
                    <span className="text-xs font-black text-slate-700">Advanced Filters</span>
                    <span className="text-[10px] font-bold text-rose-500 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                      Upgrade to Unlock
                    </span>
                  </button>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 mt-2 bg-gradient-to-r from-rose-500 to-pink-600 text-white text-xs font-extrabold rounded-xl hover:from-rose-600 hover:to-pink-700 shadow-lg shadow-rose-200 transition-all"
              >
                🔍 Apply Filters
              </button>
            </form>
          </motion.div>

          {/* Profiles Grid */}
          <div className="space-y-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-rose-500 border-t-transparent" />
                <p className="text-slate-400 text-sm font-semibold">Finding perfect matches...</p>
              </div>
            ) : error ? (
              <div className="bg-red-50 text-red-800 rounded-3xl p-6 text-center border border-red-100">
                {error}
              </div>
            ) : profilesList.length === 0 ? (
              <div className="bg-white border border-slate-100 rounded-3xl p-10 text-center shadow-sm">
                <p className="text-slate-400 text-sm font-bold">No approved profiles match your filter options.</p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-4 px-5 py-2.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-500 text-xs font-bold transition-all cursor-pointer"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {profilesList.map((profile) => (
                    <motion.div
                      key={profile.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group"
                    >
                      <div className="relative aspect-[4/5] bg-slate-50 overflow-hidden">
                        <SmartImage
                          src={profile.photo}
                          alt={profile.name}
                          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                        />
                        {profile.photoVisibility === 'pending_approval' ? (
                          <div className="absolute inset-x-3 bottom-3 rounded-lg bg-slate-900/80 px-3 py-2 text-center text-xs font-bold text-white">
                            Photo pending approval
                          </div>
                        ) : null}
                        {isOnline(profile.id) && (
                          <div className="absolute bottom-3 right-3 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white shadow-sm" title="Online now" />
                        )}
                        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-xl shadow text-xs font-black text-rose-500 flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-rose-500 stroke-none" /> {profile.compatibility}%
                        </div>
                        <div className="absolute top-4 right-4 flex flex-col gap-1.5 items-end">
                          {profile.verified && (
                            <span className="bg-emerald-500 text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg shadow-sm">Verified</span>
                          )}
                          {profile.premium && (
                            <span className="bg-amber-500 text-slate-900 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg shadow-sm">Premium</span>
                          )}
                        </div>
                      </div>
                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="font-extrabold text-lg text-slate-800 truncate mb-1">{profile.name}, {profile.age}</h3>
                          <p className="text-slate-500 text-xs font-bold mb-3 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" /> {profile.location}
                          </p>
                          <div className="flex flex-wrap gap-1 mb-4">
                            <span className="text-[10px] bg-slate-50 text-slate-600 px-2 py-1 rounded font-semibold border border-slate-100">{profile.religion}</span>
                            <span className="text-[10px] bg-slate-50 text-slate-600 px-2 py-1 rounded font-semibold border border-slate-100 truncate max-w-[120px]">{profile.occupation}</span>
                          </div>
                          <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed mb-4 font-medium">{profile.about}</p>
                        </div>
                        <div className="flex gap-2 border-t border-slate-50 pt-4">
                          <Link
                            to={`/profile/${profile.id}`}
                            className="flex-1 text-center py-2.5 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-extrabold transition-all border border-slate-100"
                          >
                            View Profile
                          </Link>
                          <button
                            onClick={() => expressInterest(profile.id)}
                            disabled={busyId === profile.id}
                            className="px-3 rounded-xl bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-600 transition-all border border-rose-100 flex items-center justify-center cursor-pointer"
                            title="Send Interest"
                          >
                            <Heart className="w-4 h-4 fill-current" />
                          </button>
                          <Link
                            to={`/messages?user=${profile.id}`}
                            state={{ profile }}
                            className="px-3 rounded-xl bg-blue-50 hover:bg-blue-500 hover:text-white text-blue-600 transition-all border border-blue-100 flex items-center justify-center"
                            title="Direct Message"
                          >
                            <MessageCircle className="w-4 h-4 fill-none" />
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Load More */}
                {hasMore && (
                  <div className="text-center pt-4">
                    <button
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="px-8 py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold rounded-2xl hover:from-rose-600 hover:to-pink-700 shadow-lg shadow-rose-200 transition-all disabled:opacity-60"
                    >
                      {loadingMore ? (
                        <span className="flex items-center gap-2"><span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> Loading...</span>
                      ) : (
                        `Load More (${totalCount - profilesList.length} remaining)`
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Upgrade modal for advanced search lock */}
      <AnimatePresence>
        {showUpgradeModal && (
          <UpgradeModal
            feature="advanced_search"
            onClose={() => setShowUpgradeModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
