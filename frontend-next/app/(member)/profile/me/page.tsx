'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Shield, Crown, MapPin, GraduationCap, Briefcase,
  Calendar, Ruler, Heart, Users, Star, ChevronRight,
  Edit, Camera, Loader2, CheckCircle, XCircle, AlertTriangle, Trash2,
} from 'lucide-react';
import Link from 'next/link';
import ProfileImage from '@/components/profile/ProfileImage';
import { useAuth } from '@/legacy/contexts/AuthContext';
import { fetchApi } from '@/legacy/services/apiClient';
import { useDeletePhotoMutation, type MemberPhoto } from '@/legacy/services/photoApi';

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    approved: 'bg-green-100 text-green-700 border-green-200',
    pending_review: 'bg-amber-100 text-amber-700 border-amber-200',
    rejected: 'bg-red-100 text-red-700 border-red-200',
    draft: 'bg-gray-100 text-gray-500 border-gray-200',
    not_started: 'bg-gray-100 text-gray-500 border-gray-200',
    submitted: 'bg-blue-100 text-blue-700 border-blue-200',
    changes_requested: 'bg-amber-100 text-amber-700 border-amber-200',
  };
  const label: Record<string, string> = {
    approved: 'Approved',
    pending_review: 'Under Review',
    rejected: 'Rejected',
    draft: 'Draft',
    not_started: 'Draft',
    submitted: 'Submitted',
    changes_requested: 'Changes Requested',
  };
  const s = status?.toLowerCase() || 'draft';
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border text-xs font-bold ${styles[s] || styles.draft}`}>
      {s === 'approved' ? <CheckCircle className="w-3 h-3" /> :
       s === 'rejected' ? <XCircle className="w-3 h-3" /> :
       s === 'changes_requested' ? <AlertTriangle className="w-3 h-3" /> : null}
      {label[s] || 'Draft'}
    </span>
  );
}

export default function MyProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletePhoto] = useDeletePhotoMutation();

  const handleDelete = async (photoId: string) => {
    if (!window.confirm('Are you sure you want to delete this photo?')) return;
    setDeletingId(photoId);
    try {
      await deletePhoto(photoId).unwrap();
      setProfile((prev: any) => ({
        ...prev,
        photos: (prev.photos || []).filter((ph: any) => ph.id !== photoId),
      }));
    } catch {
      setError('Failed to delete photo. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    fetchApi<any>('/member-auth/me/')
      .then((data) => { setProfile(data); setLoading(false); })
      .catch((err) => { setError(err.message || 'Failed to load profile'); setLoading(false); });
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 pb-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="animate-pulse space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-8">
              <div className="flex gap-6">
                <div className="w-28 h-28 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-3">
                  <div className="h-6 w-48 bg-gray-200 rounded" />
                  <div className="h-4 w-32 bg-gray-100 rounded" />
                  <div className="h-4 w-24 bg-gray-100 rounded" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 pb-16 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 font-semibold">Please sign in to view your profile.</p>
          <Link href="/login" className="mt-4 inline-block px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 text-white font-bold text-sm">Sign In</Link>
        </div>
      </div>
    );
  }

  const p = profile;
  const photos: MemberPhoto[] = p.photos || [];
  const approvedPhotos = photos.filter((ph) => ph.status === 'approved');
  const primaryPhoto = approvedPhotos.find((ph) => ph.is_primary) || approvedPhotos[0];
  const pendingPhotos = photos.filter((ph) => ph.status === 'pending');
  const rejectedPhotos = photos.filter((ph) => ph.status === 'rejected');
  const completion = p.completion_percentage ?? 0;

  return (
    <div className="min-h-screen bg-gray-50 pt-16 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link href="/dashboard">Dashboard</Link>
          <ChevronRight className="w-4 h-4" />
          <span>My Profile</span>
        </div>

        {/* Profile Header Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 mb-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="shrink-0">
              <ProfileImage
                photoId={primaryPhoto?.id}
                src={primaryPhoto?.thumbnail_url}
                variant="thumbnail"
                version={(primaryPhoto as any)?.updated_at}
                alt="Profile"
                size="xl"
                shape="circle"
                className="w-28 h-28 rounded-full mx-auto md:mx-0"
              />
            </div>
            <div className="flex-1 min-w-0 text-center md:text-left">
              <div className="flex flex-wrap items-center gap-3 mb-2 justify-center md:justify-start">
                <h1 className="text-2xl font-extrabold text-gray-900">{p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim()}</h1>
                {p.is_premium && <Crown className="w-5 h-5 text-amber-500" title="Premium Member" />}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-3 justify-center md:justify-start">
                {p.age && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{p.age} yrs</span>}
                {p.gender && <span>{p.gender}</span>}
                {p.work_location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{p.work_location}</span>}
                {p.height && <span className="flex items-center gap-1"><Ruler className="w-3.5 h-3.5" />{p.height}</span>}
                {p.marital_status && <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" />{p.marital_status}</span>}
              </div>
              <div className="flex flex-wrap items-center gap-2 justify-center md:justify-start">
                {statusBadge(p.profile_status)}
                {p.is_fully_verified && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-700 text-xs font-bold">
                    <Shield className="w-3 h-3" /> Verified
                  </span>
                )}
                <Link href="/settings/profile" className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors">
                  <Edit className="w-3.5 h-3.5" /> Edit Profile
                </Link>
                <Link href="/profile/photos" className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-rose-200 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors">
                  <Camera className="w-3.5 h-3.5" /> Manage Photos
                </Link>
              </div>
            </div>
          </div>

          {/* Profile Completeness */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Profile Completeness</span>
              <span className="text-sm font-bold text-gray-700">{completion}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-400 to-rose-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(completion, 100)}%` }} />
            </div>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Left Column - Quick Info */}
          <div className="space-y-6">
            {/* Personal Details */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-bold text-sm text-gray-400 uppercase tracking-wider mb-4">Personal Details</h2>
              <dl className="space-y-3 text-sm">
                {p.religion && <div className="flex justify-between"><dt className="text-gray-500">Religion</dt><dd className="font-semibold text-gray-800">{p.religion}</dd></div>}
                {p.mother_tongue && <div className="flex justify-between"><dt className="text-gray-500">Mother Tongue</dt><dd className="font-semibold text-gray-800">{p.mother_tongue}</dd></div>}
                {p.caste && <div className="flex justify-between"><dt className="text-gray-500">Caste</dt><dd className="font-semibold text-gray-800">{p.caste}</dd></div>}
                {p.marital_status && <div className="flex justify-between"><dt className="text-gray-500">Marital Status</dt><dd className="font-semibold text-gray-800">{p.marital_status}</dd></div>}
                {p.manglik_status && <div className="flex justify-between"><dt className="text-gray-500">Manglik</dt><dd className="font-semibold text-gray-800">{p.manglik_status}</dd></div>}
                {p.height && <div className="flex justify-between"><dt className="text-gray-500">Height</dt><dd className="font-semibold text-gray-800">{p.height}</dd></div>}
                {p.weight && <div className="flex justify-between"><dt className="text-gray-500">Weight</dt><dd className="font-semibold text-gray-800">{p.weight}</dd></div>}
                {p.blood_group && <div className="flex justify-between"><dt className="text-gray-500">Blood Group</dt><dd className="font-semibold text-gray-800">{p.blood_group}</dd></div>}
                {p.complexion && <div className="flex justify-between"><dt className="text-gray-500">Complexion</dt><dd className="font-semibold text-gray-800">{p.complexion}</dd></div>}
              </dl>
            </motion.div>

            {/* Verification Status */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-bold text-sm text-gray-400 uppercase tracking-wider mb-4">Verification</h2>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Email</span>
                  {p.is_email_verified
                    ? <span className="flex items-center gap-1 text-green-600 font-semibold"><CheckCircle className="w-3.5 h-3.5" /> Verified</span>
                    : <span className="flex items-center gap-1 text-amber-600 font-semibold"><AlertTriangle className="w-3.5 h-3.5" /> Unverified</span>}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Mobile</span>
                  {p.is_mobile_verified
                    ? <span className="flex items-center gap-1 text-green-600 font-semibold"><CheckCircle className="w-3.5 h-3.5" /> Verified</span>
                    : <span className="flex items-center gap-1 text-amber-600 font-semibold"><AlertTriangle className="w-3.5 h-3.5" /> Unverified</span>}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Photo</span>
                  {statusBadge(p.photo_status)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Document</span>
                  {statusBadge(p.document_status)}
                </div>
              </div>
            </motion.div>

            {/* Photos - Owner Pending/Rejected */}
            {pendingPhotos.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl border border-gray-100 p-5">
                <h2 className="font-bold text-sm text-gray-400 uppercase tracking-wider mb-3">
                  Pending Photos ({pendingPhotos.length})
                </h2>
                <div className="flex gap-2 flex-wrap">
                  {pendingPhotos.map((ph) => (
                    <div key={ph.id} className="relative group">
                      <ProfileImage photoId={ph.id} src={ph.thumbnail_url} variant="thumbnail" alt="" size="sm" shape="square" className="w-16 h-16 rounded-lg" />
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border-2 border-white" />
                      <button
                        type="button"
                        onClick={() => handleDelete(ph.id)}
                        disabled={deletingId === ph.id}
                        className="absolute -top-2 -left-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white shadow opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-50"
                        aria-label="Delete photo"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Right Column - Detailed Info */}
          <div className="md:col-span-2 space-y-6">
            {/* About */}
            {p.about && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl border border-gray-100 p-5">
                <h2 className="font-bold text-sm text-gray-400 uppercase tracking-wider mb-3">About Me</h2>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{p.about}</p>
              </motion.div>
            )}

            {/* Career & Education */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-bold text-sm text-gray-400 uppercase tracking-wider mb-4">Career & Education</h2>
              <dl className="grid sm:grid-cols-2 gap-3 text-sm">
                {p.highest_education && <div><dt className="text-gray-500 text-xs">Education</dt><dd className="font-semibold text-gray-800">{p.highest_education}{p.education_detail ? ` - ${p.education_detail}` : ''}</dd></div>}
                {p.occupation && <div><dt className="text-gray-500 text-xs">Occupation</dt><dd className="font-semibold text-gray-800">{p.occupation}</dd></div>}
                {p.employed_in && <div><dt className="text-gray-500 text-xs">Employed In</dt><dd className="font-semibold text-gray-800">{p.employed_in}</dd></div>}
                {p.annual_income && <div><dt className="text-gray-500 text-xs">Annual Income</dt><dd className="font-semibold text-gray-800">{p.annual_income}</dd></div>}
                {p.work_location && <div><dt className="text-gray-500 text-xs">Location</dt><dd className="font-semibold text-gray-800">{p.work_location}</dd></div>}
              </dl>
            </motion.div>

            {/* Family Details */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-bold text-sm text-gray-400 uppercase tracking-wider mb-4">Family Details</h2>
              <dl className="grid sm:grid-cols-2 gap-3 text-sm">
                {p.father_status && <div><dt className="text-gray-500 text-xs">Father</dt><dd className="font-semibold text-gray-800">{p.father_status}</dd></div>}
                {p.mother_status && <div><dt className="text-gray-500 text-xs">Mother</dt><dd className="font-semibold text-gray-800">{p.mother_status}</dd></div>}
                {(p.num_brothers > 0 || p.num_sisters > 0) && (
                  <div><dt className="text-gray-500 text-xs">Siblings</dt><dd className="font-semibold text-gray-800">{p.num_brothers || 0} brother{p.num_brothers !== 1 ? 's' : ''}, {p.num_sisters || 0} sister{p.num_sisters !== 1 ? 's' : ''}</dd></div>
                )}
                {p.family_type && <div><dt className="text-gray-500 text-xs">Family Type</dt><dd className="font-semibold text-gray-800">{p.family_type}</dd></div>}
                {p.family_status && <div><dt className="text-gray-500 text-xs">Family Status</dt><dd className="font-semibold text-gray-800">{p.family_status}</dd></div>}
                {p.family_location && <div><dt className="text-gray-500 text-xs">Family Location</dt><dd className="font-semibold text-gray-800">{p.family_location}</dd></div>}
              </dl>
            </motion.div>

            {/* Partner Preferences */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-bold text-sm text-gray-400 uppercase tracking-wider mb-4">Partner Preferences</h2>
              <dl className="grid sm:grid-cols-2 gap-3 text-sm">
                {(p.pref_age_min || p.pref_age_max) && <div><dt className="text-gray-500 text-xs">Age</dt><dd className="font-semibold text-gray-800">{p.pref_age_min || 'Any'} - {p.pref_age_max || 'Any'} yrs</dd></div>}
                {(p.pref_height_min || p.pref_height_max) && <div><dt className="text-gray-500 text-xs">Height</dt><dd className="font-semibold text-gray-800">{p.pref_height_min || 'Any'} - {p.pref_height_max || 'Any'}</dd></div>}
                {p.pref_religion && <div><dt className="text-gray-500 text-xs">Religion</dt><dd className="font-semibold text-gray-800">{p.pref_religion}</dd></div>}
                {p.pref_location && <div><dt className="text-gray-500 text-xs">Location</dt><dd className="font-semibold text-gray-800">{p.pref_location}</dd></div>}
                {p.pref_marital_status && <div><dt className="text-gray-500 text-xs">Marital Status</dt><dd className="font-semibold text-gray-800">{p.pref_marital_status}</dd></div>}
              </dl>
              {p.pref_about && <p className="mt-3 text-sm text-gray-700 leading-relaxed">{p.pref_about}</p>}
            </motion.div>

            {/* Approved Photos Gallery */}
            {approvedPhotos.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-2xl border border-gray-100 p-5">
                <h2 className="font-bold text-sm text-gray-400 uppercase tracking-wider mb-3">Photos ({approvedPhotos.length})</h2>
                <div className="flex gap-3 flex-wrap">
                  {approvedPhotos.map((ph) => (
                    <div key={ph.id} className="relative group">
                      <ProfileImage photoId={ph.id} src={ph.thumbnail_url} variant="thumbnail" version={(ph as any).updated_at} alt="" size="md" shape="square" className="w-24 h-24 rounded-xl" />
                      <button
                        type="button"
                        onClick={() => handleDelete(ph.id)}
                        disabled={deletingId === ph.id}
                        className="absolute right-1 top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white shadow disabled:opacity-50"
                        aria-label="Delete photo"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Rejected Photos - Owner visible */}
            {rejectedPhotos.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="bg-white rounded-2xl border border-red-100 p-5">
                <h2 className="font-bold text-sm text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5 text-red-400" /> Rejected Photos ({rejectedPhotos.length})
                </h2>
                <div className="flex gap-3 flex-wrap">
                  {rejectedPhotos.map((ph) => (
                    <div key={ph.id} className="relative group">
                      <ProfileImage photoId={ph.id} src={ph.thumbnail_url} variant="thumbnail" alt="" size="sm" shape="square" className="w-16 h-16 rounded-lg opacity-60" />
                      <button
                        type="button"
                        onClick={() => handleDelete(ph.id)}
                        disabled={deletingId === ph.id}
                        className="absolute -top-2 -left-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white shadow opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-50"
                        aria-label="Delete photo"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                      {(ph as any).rejection_reason && <p className="text-[10px] text-red-500 mt-1 max-w-16">{ph.rejection_reason}</p>}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
