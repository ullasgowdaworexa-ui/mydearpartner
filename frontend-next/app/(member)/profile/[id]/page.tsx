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
      className="min-h-screen pb-16 bg-gradient-to-b from-slate-50 to-white"
    >
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Portrait profile images always retain the shared 4:5 crop. */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`relative mt-6 overflow-hidden rounded-3xl shadow-2xl ${primaryPhoto ? 'group cursor-pointer' : ''}`}
          onClick={primaryPhoto ? () => openLightbox(0) : undefined}
        >
          <div className="relative mx-auto aspect-[4/5] w-full max-w-2xl">
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
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-3xl font-black mb-1">{profile.user.full_name}, {profile.age}</h2>
                <p className="text-white/80 text-sm flex items-center gap-1">
                  <MapPin className="w-4 h-4" /> {profile.location?.city || profile.user.work_location || 'India'}
                </p>
              </div>
              <div className="flex flex-col gap-2 items-end">
                {profile.user.is_verified && (
                  <span className="bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Verified
                  </span>
                )}
                {profile.user.is_premium && (
                  <span className="bg-amber-500 text-slate-900 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <Crown className="w-3 h-3" /> Premium
                  </span>
                )}
              </div>
            </div>
          </div>
          {photos.length > 1 && (
            <div className="absolute top-4 right-4 bg-black/50 text-white text-xs font-bold px-3 py-1.5 rounded-full">
              📷 {photos.length} Photos
            </div>
          )}
        </motion.div>

        {/* Photo Gallery Grid */}
        {photos.length > 1 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-4">
            <div className="grid grid-cols-5 gap-2">
              {photos.map((ph: any, idx: number) => (
                <div
                  key={ph.id || idx}
                  onClick={() => openLightbox(idx)}
                  className="relative aspect-[4/5] overflow-hidden rounded-2xl border-2 border-transparent shadow-sm transition-all hover:border-rose-400 cursor-pointer group"
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
                    <span className="absolute top-1 left-1 bg-amber-500 text-white text-[8px] font-black px-1 py-0.5 rounded shadow">★</span>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-6 flex flex-wrap gap-3">
          {!isOwnProfile && (
            <>
              <button
                onClick={handleSendInterest}
                disabled={interestLoading || interestSent}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all ${
                  interestSent
                    ? 'bg-green-100 text-green-700 border border-green-200 cursor-default'
                    : 'bg-gradient-to-r from-rose-500 to-pink-600 text-white hover:from-rose-600 hover:to-pink-700 shadow-lg shadow-rose-200'
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
                  className="flex items-center gap-2 px-6 py-3 bg-blue-50 hover:bg-blue-500 hover:text-white text-blue-700 border border-blue-200 rounded-2xl font-bold text-sm transition-all"
                >
                  <MessageCircle className="w-4 h-4" /> Message
                </Link>
              )}

              <button
                onClick={handleShortlist}
                disabled={shortlistLoading}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all border ${
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
                className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-200 text-gray-700 rounded-2xl font-bold text-sm hover:bg-gray-50 transition-all"
              >
                <Scale className="w-4 h-4" /> Compare
              </Link>

              <button
                onClick={() => setReportModalOpen(true)}
                className="flex items-center gap-2 px-4 py-3 border border-gray-200 text-gray-500 rounded-2xl font-bold text-sm hover:bg-gray-50 transition-all ml-auto"
              >
                <Flag className="w-4 h-4" /> Report
              </button>
            </>
          )}
        </motion.div>

        {/* Profile Info Grid */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-8 grid md:grid-cols-2 gap-6">
          {/* Personal Details */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h3 className="text-base font-black text-gray-900 border-b border-gray-100 pb-3">Personal Details</h3>
            <div className="space-y-3 text-sm">
              {[
                { icon: Calendar, label: 'Age', value: profile.age ? `${profile.age} years` : null },
                { icon: Ruler, label: 'Height', value: profile.height },
                { icon: Globe, label: 'Religion', value: profile.religion },
                { icon: Users, label: 'Mother Tongue', value: profile.mother_tongue },
                { icon: Home, label: 'Marital Status', value: profile.marital_status },
                { icon: MapPin, label: 'Family Type', value: profile.family_type },
              ].map(({ icon: Icon, label, value }) => value && (
                <div key={label} className="flex items-center gap-3 text-gray-700">
                  <div className="w-8 h-8 bg-rose-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-rose-500" />
                  </div>
                  <span className="text-gray-400 w-28 flex-shrink-0 text-xs font-semibold uppercase">{label}</span>
                  <span className="font-semibold">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Career & Education */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h3 className="text-base font-black text-gray-900 border-b border-gray-100 pb-3">Career & Education</h3>
            <div className="space-y-3 text-sm">
              {[
                { icon: GraduationCap, label: 'Education', value: profile.education },
                { icon: Briefcase, label: 'Occupation', value: profile.occupation },
                { icon: MapPin, label: 'Work City', value: profile.location?.city || profile.user.work_location },
                { icon: Star, label: 'Annual Income', value: profile.income },
              ].map(({ icon: Icon, label, value }) => value && (
                <div key={label} className="flex items-center gap-3 text-gray-700">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-blue-500" />
                  </div>
                  <span className="text-gray-400 w-28 flex-shrink-0 text-xs font-semibold uppercase">{label}</span>
                  <span className="font-semibold">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* About */}
        {profile.about && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mt-6 bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-base font-black text-gray-900 mb-3">About</h3>
            <p className="text-gray-600 text-sm leading-relaxed">{profile.about}</p>
          </motion.div>
        )}

        {/* Hobbies */}
        {profile.hobbies && profile.hobbies.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-6 bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-base font-black text-gray-900 mb-3">Hobbies & Interests</h3>
            <div className="flex flex-wrap gap-2">
              {profile.hobbies.map((h: string, index: number) => (
                <span key={`${h}-${index}`} className="px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-100 rounded-full text-xs font-bold">{h}</span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Contact Info */}
        {profile.can_view_contact && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mt-6 bg-green-50 rounded-3xl border border-green-200 p-6">
            <h3 className="text-base font-black text-gray-900 mb-3 flex items-center gap-2"><Phone className="w-5 h-5 text-green-600" /> Contact Information</h3>
            <div className="space-y-2">
              {profile.user.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-green-600" />
                  <span className="text-gray-900 font-semibold">{profile.user.phone}</span>
                </div>
              )}
              {profile.user.email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-green-600" />
                  <span className="text-gray-900 font-semibold">{profile.user.email}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
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
