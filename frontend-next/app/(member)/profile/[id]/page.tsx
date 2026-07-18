'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, MessageCircle, Shield, Crown, MapPin, GraduationCap,
  Briefcase, Users, Star, Phone, Mail, Calendar, Ruler, Globe,
  Home, ChevronLeft, ChevronRight, Send, Check, Flag, Loader2,
  ArrowLeft, X, Bookmark, BookmarkCheck, Scale,
} from 'lucide-react';
import Link from 'next/link';
import ProfileImage from '@/components/profile/ProfileImage';
import { useGetProfileDetailQuery, useSendInterestMutation } from '@/legacy/services/profileApi';
import type { MemberPhoto } from '@/legacy/services/photoApi';
import UnlockModal from '@/components/member/unlock-modal';
import UpgradeModal from '@/components/member/upgrade-modal';
import { useAuth } from '@/legacy/contexts/AuthContext';
import { toggleShortlist, isProfileShortlisted } from '@/legacy/services/dataService';

export default function ProfileDetailPage() {
  const params = useParams();
  const router = useRouter();
  const profileId = params.id as string;

  const { user } = useAuth();
  const { data: profileData, isLoading, error } = useGetProfileDetailQuery(profileId);
  const [sendInterest, { isLoading: interestLoading }] = useSendInterestMutation();

  const [limitExceeded, setLimitExceeded] = useState(false);
  const [unlockError, setUnlockError] = useState<any>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState<'messaging' | 'advanced_search' | 'contact_details' | 'all_photos' | null>(null);
  const [shortlisted, setShortlisted] = useState(false);
  const [shortlistLoading, setShortlistLoading] = useState(false);
  const [interestSent, setInterestSent] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('Fake profile');
  const [reportDetails, setReportDetails] = useState('');
  // Lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);

  const isOwnProfile = user?.id === profileData?.profile?.user?.id;

  useEffect(() => {
    if (error && 'status' in error) {
      const apiError = error as any;
      if (apiError.status === 403 && apiError.data?.code === 'daily_profile_unlock_limit_reached') {
        setLimitExceeded(true);
        setUnlockError(apiError.data);
      }
    }
  }, [error]);

  // Initialize shortlist state from API
  useEffect(() => {
    if (profileId) {
      isProfileShortlisted(profileId).then(setShortlisted).catch(() => {});
    }
  }, [profileId]);

  const handleSendInterest = async () => {
    try {
      await sendInterest(profileId).unwrap();
      setInterestSent(true);
    } catch (err: any) {
      if (err.data?.code === 'daily_interest_limit_reached') {
        setShowUpgradeModal('advanced_search');
      } else {
        alert(err.data?.message || 'Failed to send interest');
      }
    }
  };

  const handleShortlist = useCallback(async () => {
    if (shortlistLoading) return;
    setShortlistLoading(true);
    try {
      const result = await toggleShortlist(profileId);
      setShortlisted(result.shortlisted);
    } catch {
      // Optimistic fallback
      setShortlisted((prev) => !prev);
    } finally {
      setShortlistLoading(false);
    }
  }, [profileId, shortlistLoading]);

  const openLightbox = (idx: number) => {
    setLightboxIdx(idx);
    setLightboxOpen(true);
  };

  const closeLightbox = () => setLightboxOpen(false);
  const prevPhoto = () => setLightboxIdx((i) => Math.max(0, i - 1));
  const nextPhoto = (maxLen: number) => setLightboxIdx((i) => Math.min(maxLen - 1, i + 1));

  if (limitExceeded && unlockError) {
    return (
      <UnlockModal
        dailyLimit={unlockError.limit}
        usedToday={unlockError.used}
        resetsAt={unlockError.resets_at}
        onClose={() => router.back()}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen pt-32 px-4 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Profile Not Found</h2>
          <p className="text-gray-600 mb-6">This profile is unavailable or you don't have permission to view it.</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-rose-500 text-white rounded-lg font-bold hover:bg-rose-600 transition-colors"
          >
            Back to Search
          </button>
        </div>
      </div>
    );
  }

  if (!profileData?.profile) return null;

  const profile = profileData.profile as any;
  // Only render photos that belong to this member. Extra gallery slots are
  // intentionally not filled with stock portraits.
  const photos: MemberPhoto[] = Array.isArray(profile.photos) && profile.photos.length > 0
    ? profile.photos
    : profile.user.primary_photo?.id
      ? [profile.user.primary_photo]
      : [];
  const primaryPhoto = photos[0] ?? null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen pb-20 bg-[#faf6f0]"
    >
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-rose-600 hover:text-rose-700 font-bold text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="text-center">
            <h1 className="text-base font-bold text-gray-900">{profile.user.full_name}</h1>
            <p className="text-xs text-gray-500">{profile.age} years • {profile.location?.city || profile.user.work_location || ''}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/compare?candidate=${profileId}`} className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors" title="Compare">
              <Scale className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="grid md:grid-cols-[360px_1fr] gap-8 items-start">
          
          {/* Left Column (Sticky Image, Gallery & Actions) */}
          <div className="space-y-6 md:sticky md:top-20">
            {/* Profile Photo */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`relative overflow-hidden rounded-[2rem] shadow-[0_15px_35px_rgba(43,16,29,0.08)] border border-slate-100/50 ${primaryPhoto ? 'group cursor-pointer' : ''}`}
              onClick={primaryPhoto ? () => openLightbox(0) : undefined}
            >
              <div className="relative aspect-[4/5] w-full bg-[#160910]">
                <ProfileImage
                  photoId={primaryPhoto?.id}
                  src={primaryPhoto?.image_url ?? primaryPhoto?.thumbnail_url}
                  variant="image"
                  version={primaryPhoto?.updated_at}
                  alt={`${profile.user.full_name}'s profile photo`}
                  size="full"
                  aspectRatio="4:5"
                  shape="square"
                  gender={profile.gender}
                  className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.02]"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-0 left-0 right-0 p-5 text-white z-10">
                <h2 className="text-2xl font-black mb-1">{profile.user.full_name}, {profile.age}</h2>
                <p className="text-white/80 text-xs flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[var(--gold-400)]" /> {profile.location?.city || profile.user.work_location || 'India'}
                </p>
              </div>
              {photos.length > 1 && (
                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full border border-white/10">
                  📷 {photos.length} Photos
                </div>
              )}
            </motion.div>

            {/* Gallery Thumbnails */}
            {photos.length > 1 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-5 gap-2">
                {photos.map((ph: any, idx: number) => (
                  <div
                    key={ph.id || idx}
                    onClick={() => openLightbox(idx)}
                    className="relative aspect-[4/5] overflow-hidden rounded-xl border-2 border-transparent shadow-sm transition-all hover:border-[var(--rose-500)] cursor-pointer group bg-[#160910]"
                  >
                    <ProfileImage
                      photoId={ph.id}
                      src={ph.thumbnail_url}
                      variant="thumbnail"
                      version={ph.updated_at}
                      alt={`${profile.user.full_name} photo ${idx + 1}`}
                      size="full"
                      aspectRatio="4:5"
                      shape="square"
                      gender={profile.gender}
                      className="absolute inset-0 transition-transform duration-300 group-hover:scale-105"
                    />
                    {ph.is_primary && (
                      <span className="absolute top-1 left-1 bg-[var(--gold-500)] text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow">★</span>
                    )}
                  </div>
                ))}
              </motion.div>
            )}

            {/* Main Action Buttons */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-3">
              {!isOwnProfile && (
                <>
                  <button
                    onClick={handleSendInterest}
                    disabled={interestLoading || interestSent}
                    className={`w-full py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                      interestSent
                        ? 'bg-green-50 text-green-700 border border-green-200 cursor-default'
                        : 'bg-gradient-to-r from-[var(--rose-500)] to-[#4a162b] text-white hover:opacity-95 shadow-lg shadow-rose-200'
                    }`}
                  >
                    {interestSent ? (
                      <><Check className="w-4 h-4" /> Interest Sent!</>
                    ) : interestLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                    ) : (
                      <><Heart className="w-4 h-4 fill-white" /> Send Interest</>
                    )}
                  </button>

                  {profile.can_message && (
                    <Link
                      href={`/messages?user=${profileId}`}
                      className="w-full py-4 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      <MessageCircle className="w-4 h-4" /> Message Candidate
                    </Link>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={handleShortlist}
                      disabled={shortlistLoading}
                      className={`flex-1 py-3.5 rounded-2xl font-bold text-sm transition-all border flex items-center justify-center gap-1.5 ${
                        shortlisted
                          ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {shortlistLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : shortlisted ? (
                        <><BookmarkCheck className="w-4 h-4 fill-rose-500 stroke-none" /> Shortlisted</>
                      ) : (
                        <><Bookmark className="w-4 h-4" /> Shortlist</>
                      )}
                    </button>

                    <Link
                      href={`/compare?candidate=${profileId}`}
                      className="flex-1 py-3.5 bg-white border border-gray-200 text-gray-700 rounded-2xl font-bold text-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Scale className="w-4 h-4" /> Compare
                    </Link>
                  </div>
                </>
              )}
            </motion.div>
          </div>

          {/* Right Column (Info Panels) */}
          <div className="space-y-6">
            {/* Header info badge card */}
            <div className="bg-white rounded-[2rem] border border-gray-100 p-6 flex flex-wrap justify-between items-center gap-4 shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Candidate Profile</span>
                  {profile.user.is_verified && (
                    <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-100 uppercase tracking-wide flex items-center gap-0.5">
                      <Shield className="w-3 h-3" /> Verified
                    </span>
                  )}
                  {profile.user.is_premium && (
                    <span className="bg-amber-50 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-100 uppercase tracking-wide flex items-center gap-0.5">
                      <Crown className="w-3 h-3" /> Premium
                    </span>
                  )}
                </div>
                <h1 className="text-2xl font-extrabold font-display text-slate-900">{profile.user.full_name}</h1>
              </div>
              {!isOwnProfile && (
                <button
                  onClick={() => setReportModalOpen(true)}
                  className="px-4 py-2 border border-slate-200 text-slate-400 hover:text-rose-600 rounded-xl font-bold text-xs hover:bg-slate-50 transition-all flex items-center gap-1.5"
                >
                  <Flag className="w-3.5 h-3.5" /> Report Profile
                </button>
              )}
            </div>

            {/* About Card */}
            {profile.about && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-[2rem] border border-gray-100 p-6 sm:p-8 shadow-sm">
                <h3 className="text-base font-black text-slate-900 mb-3 font-display">About Candidate</h3>
                <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">{profile.about}</p>
              </motion.div>
            )}

            {/* General & Physical Details */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid sm:grid-cols-2 gap-6">
              <div className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm space-y-4">
                <h3 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3 font-display">Personal Profile</h3>
                <div className="space-y-4">
                  {[
                    { icon: Calendar, label: 'Age', value: profile.age ? `${profile.age} years` : null },
                    { icon: Ruler, label: 'Height', value: profile.height },
                    { icon: Globe, label: 'Religion', value: profile.religion },
                    { icon: Users, label: 'Mother Tongue', value: profile.mother_tongue },
                    { icon: Home, label: 'Marital Status', value: profile.marital_status },
                    { icon: MapPin, label: 'Family Type', value: profile.family_type },
                  ].map(({ icon: Icon, label, value }) => value && (
                    <div key={label} className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-rose-50 rounded-xl flex items-center justify-center shrink-0 border border-rose-100/50">
                        <Icon className="w-4 h-4 text-rose-500" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                        <p className="text-sm font-semibold text-slate-700 mt-0.5">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Career & Education Details */}
              <div className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm space-y-4">
                <h3 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3 font-display">Career & Education</h3>
                <div className="space-y-4">
                  {[
                    { icon: GraduationCap, label: 'Education Details', value: profile.education },
                    { icon: Briefcase, label: 'Occupation', value: profile.occupation },
                    { icon: MapPin, label: 'Work City', value: profile.location?.city || profile.user.work_location },
                    { icon: Star, label: 'Annual Income', value: profile.income },
                  ].map(({ icon: Icon, label, value }) => value && (
                    <div key={label} className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center shrink-0 border border-blue-100/50">
                        <Icon className="w-4 h-4 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                        <p className="text-sm font-semibold text-slate-700 mt-0.5">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Hobbies & Interests */}
            {profile.hobbies && profile.hobbies.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-[2rem] border border-gray-100 p-6 sm:p-8 shadow-sm">
                <h3 className="text-base font-black text-slate-900 mb-4 font-display">Hobbies & Interests</h3>
                <div className="flex flex-wrap gap-2.5">
                  {profile.hobbies.map((h: string, index: number) => (
                    <span key={`${h}-${index}`} className="px-4 py-2 bg-rose-50 text-[var(--rose-500)] border border-rose-100/60 rounded-xl text-xs font-bold">
                      {h}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Contact Details Panel */}
            {profile.can_view_contact && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-gradient-to-br from-emerald-50 to-white rounded-[2rem] border border-emerald-100 p-6 sm:p-8 shadow-sm space-y-4">
                <h3 className="text-base font-black text-emerald-950 flex items-center gap-2 font-display">
                  <Phone className="w-5 h-5 text-emerald-600" /> Direct Contact Information
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  {profile.user.phone && (
                    <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-emerald-100/50 shadow-sm">
                      <Phone className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Mobile Number</p>
                        <a href={`tel:${profile.user.phone}`} className="text-sm font-bold text-slate-800 hover:text-emerald-600 transition-colors mt-0.5 block">{profile.user.phone}</a>
                      </div>
                    </div>
                  )}
                  {profile.user.email && (
                    <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-emerald-100/50 shadow-sm">
                      <Mail className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Email Address</p>
                        <a href={`mailto:${profile.user.email}`} className="text-sm font-bold text-slate-800 hover:text-emerald-600 transition-colors mt-0.5 block">{profile.user.email}</a>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Photo Lightbox */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100]"
            onClick={closeLightbox}
          >
            <button onClick={closeLightbox} className="absolute top-4 right-4 text-white/80 hover:text-white z-10">
              <X className="w-8 h-8" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
              className="absolute left-4 text-white/80 hover:text-white z-10 p-2"
              disabled={lightboxIdx === 0}
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
            <motion.div
              key={lightboxIdx}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="h-[90vh] max-w-[90vw] aspect-[4/5] overflow-hidden rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <ProfileImage
                photoId={photos[lightboxIdx]?.id}
                src={photos[lightboxIdx]?.image_url ?? photos[lightboxIdx]?.thumbnail_url}
                variant="image"
                version={photos[lightboxIdx]?.updated_at}
                alt={`${profile.user.full_name} photo ${lightboxIdx + 1}`}
                size="full"
                aspectRatio="4:5"
                shape="rounded"
                gender={profile.gender}
                className="h-full"
              />
            </motion.div>
            <button
              onClick={(e) => { e.stopPropagation(); nextPhoto(photos.length); }}
              className="absolute right-4 text-white/80 hover:text-white z-10 p-2"
              disabled={lightboxIdx === photos.length - 1}
            >
              <ChevronRight className="w-8 h-8" />
            </button>
            <div className="absolute bottom-4 text-white/60 text-sm font-bold">
              {lightboxIdx + 1} / {photos.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upgrade Modal */}
      <AnimatePresence>
        {showUpgradeModal && (
          <UpgradeModal feature={showUpgradeModal} onClose={() => setShowUpgradeModal(null)} />
        )}
      </AnimatePresence>

      {/* Report Modal */}
      <AnimatePresence>
        {reportModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setReportModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4">Report Profile</h3>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Reason</label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-300"
                  >
                    <option>Fake profile</option>
                    <option>Inappropriate photos</option>
                    <option>Offensive content</option>
                    <option>Spam</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Details</label>
                  <textarea
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Provide more details (optional)"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-300"
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setReportModalOpen(false)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors">Cancel</button>
                <button
                  onClick={() => { setReportModalOpen(false); }}
                  className="flex-1 px-4 py-2.5 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 transition-colors"
                >
                  Submit Report
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
