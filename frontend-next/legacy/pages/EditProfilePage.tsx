'use client';

import ProfileImage from '@/components/profile/ProfileImage';

import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from '@/lib/router-compat';
import { Camera, CheckCircle, ChevronRight, Save, Send, Shield, FileText, Upload, AlertCircle } from 'lucide-react';
import { useAuth, type UserType } from '../contexts/AuthContext';
import { ApiError, fetchApi } from '../services/apiClient';
import {
  MAX_PROFILE_PHOTO_BYTES,
  useDeletePhotoMutation,
  useGetMyPhotosQuery,
  useSetPrimaryPhotoMutation,
  useUploadPhotoMutation,
} from '../services/photoApi';

type ProfileUser = UserType & Record<string, unknown>;
type FormState = Record<string, string>;
type FieldConfig = { key: string; label: string; type?: 'text' | 'date' | 'number' | 'textarea' | 'select'; options?: string[] };

const sections: Record<string, FieldConfig[]> = {
  basic: [
    { key: 'first_name', label: 'First name' }, { key: 'last_name', label: 'Last name' },
    { key: 'mobile_number', label: 'Mobile number' }, { key: 'gender', label: 'Gender', type: 'select', options: ['', 'Male', 'Female'] },
    { key: 'profile_created_by', label: 'Profile created by', type: 'select', options: ['', 'Self', 'Parent', 'Sibling', 'Relative', 'Friend'] },
    { key: 'date_of_birth', label: 'Date of birth', type: 'date' }, { key: 'work_location', label: 'Current city' },
    { key: 'about', label: 'About me', type: 'textarea' }, { key: 'hobbies', label: 'Hobbies (comma separated)' },
  ],
  personal: [
    { key: 'marital_status', label: 'Marital status' }, { key: 'height', label: 'Height' },
    { key: 'weight', label: 'Weight' }, { key: 'blood_group', label: 'Blood group' },
    { key: 'complexion', label: 'Complexion' }, { key: 'religion', label: 'Religion' },
    { key: 'mother_tongue', label: 'Mother tongue' }, { key: 'caste', label: 'Caste / community' },
    { key: 'sub_caste', label: 'Sub-caste' }, { key: 'gothra', label: 'Gothra' },
    { key: 'star_nakshatra', label: 'Star / Nakshatra' },
    { key: 'manglik_status', label: 'Manglik status', type: 'select', options: ["Don't Know", 'Yes', 'No'] },
  ],
  family: [
    { key: 'father_status', label: "Father's status" }, { key: 'mother_status', label: "Mother's status" },
    { key: 'num_brothers', label: 'Number of brothers', type: 'number' }, { key: 'num_sisters', label: 'Number of sisters', type: 'number' },
    { key: 'family_type', label: 'Family type', type: 'select', options: ['', 'Nuclear', 'Joint'] },
    { key: 'family_status', label: 'Family status' }, { key: 'family_location', label: 'Family location' },
  ],
  career: [
    { key: 'highest_education', label: 'Highest education' }, { key: 'education_detail', label: 'Education details' },
    { key: 'occupation', label: 'Occupation' }, { key: 'employed_in', label: 'Employed in' },
    { key: 'company', label: 'Company' }, { key: 'annual_income', label: 'Annual income' },
  ],
  preferences: [
    { key: 'pref_age_min', label: 'Minimum age', type: 'number' }, { key: 'pref_age_max', label: 'Maximum age', type: 'number' },
    { key: 'pref_height_min', label: 'Minimum height' }, { key: 'pref_height_max', label: 'Maximum height' },
    { key: 'pref_religion', label: 'Preferred religion' }, { key: 'pref_location', label: 'Preferred locations' },
    { key: 'pref_about', label: 'About my ideal partner', type: 'textarea' },
  ],
};

const tabs = [
  ['basic', 'Basic & lifestyle'], ['photos', 'Manage photos'], ['personal', 'Personal & religion'], ['family', 'Family'],
  ['career', 'Career & education'], ['preferences', 'Partner preferences'], ['security', 'Security'],
];
const numberFields = new Set(['num_brothers', 'num_sisters', 'pref_age_min', 'pref_age_max']);

const messageFrom = (error: unknown) => {
  if (error instanceof ApiError && error.errors && typeof error.errors === 'object') {
    return Object.values(error.errors).flat().join(' ');
  }
  if (error && typeof error === 'object') {
    const record = error as { message?: unknown; data?: unknown };
    if (typeof record.message === 'string') return record.message;
    if (record.data && typeof record.data === 'object') {
      const data = record.data as { message?: unknown; detail?: unknown };
      if (typeof data.message === 'string') return data.message;
      if (typeof data.detail === 'string') return data.detail;
    }
  }
  return error instanceof Error ? error.message : 'The request could not be completed.';
};

const allowedPhotoTypes = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const allowedPhotoFilename = /\.(?:jpe?g|png|webp)$/i;

export default function EditProfilePage() {
  const { user, updateUser, logoutAll } = useAuth();
  const location = useLocation();
  const profile = user as ProfileUser | null;
  const [activeTab, setActiveTab] = useState('basic');
  const [form, setForm] = useState<FormState>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const [passwords, setPasswords] = useState({ old_password: '', new_password: '', confirm: '' });
  const { data: photosResponse, refetch: refetchPhotos } = useGetMyPhotosQuery();
  const [uploadManagedPhoto] = useUploadPhotoMutation();
  const [deleteManagedPhoto] = useDeletePhotoMutation();
  const [setManagedPrimary] = useSetPrimaryPhotoMutation();
  const photosList = photosResponse?.photos ?? [];
  const primaryPhoto = photosList.find((photo) => photo.is_primary) ?? photosList[0];
  const maxPhotos = photosResponse?.max_photos ?? 6;

  useEffect(() => {
    if (location.pathname.endsWith('/photos')) setActiveTab('photos');
    else if (location.pathname.endsWith('/documents')) setActiveTab('verification');
    else if (location.pathname === '/settings') setActiveTab('security');
  }, [location.pathname]);

  const profileFields = useMemo(() => Object.values(sections).flat(), []);
  useEffect(() => {
    if (!profile) return;
    const next: FormState = {};
    for (const { key } of profileFields) {
      const value = profile[key];
      next[key] = Array.isArray(value) ? value.join(', ') : value == null ? '' : String(value);
    }
    setForm(next);
  }, [profile, profileFields]);

  const setValue = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const save = async () => {
    setBusy(true); setNotice(null);
    try {
      const payload: Record<string, unknown> = {};
      for (const { key } of profileFields) {
        payload[key] = numberFields.has(key) ? Number(form[key] || 0) : form[key] || '';
      }
      payload.hobbies = (form.hobbies || '').split(',').map((item) => item.trim()).filter(Boolean);
      const updated = await fetchApi<UserType>('/member-auth/me/', { method: 'PATCH', body: JSON.stringify(payload) });
      updateUser(updated); setNotice({ text: 'Profile changes saved.' });
    } catch (error) { setNotice({ text: messageFrom(error), error: true }); }
    finally { setBusy(false); }
  };

  const submitForReview = async () => {
    setBusy(true); setNotice(null);
    try {
      const updated = await fetchApi<UserType>('/member-auth/me/submit/', { method: 'POST' });
      updateUser(updated); setNotice({ text: 'Profile submitted for review.' });
    } catch (error) { setNotice({ text: messageFrom(error), error: true }); }
    finally { setBusy(false); }
  };

  const uploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!allowedPhotoTypes.has(file.type.toLowerCase()) || !allowedPhotoFilename.test(file.name)) {
      setNotice({ text: 'Choose a JPEG, PNG, or WebP image.', error: true });
      e.target.value = '';
      return;
    }
    if (file.size > MAX_PROFILE_PHOTO_BYTES) {
      setNotice({ text: 'Image size must be 10 MB or smaller.', error: true });
      e.target.value = '';
      return;
    }
    setBusy(true); setNotice(null);
    try {
      await uploadManagedPhoto(file).unwrap();
      await refetchPhotos();
      setNotice({ text: 'Photo uploaded successfully and submitted for validation.' });
    } catch (error) {
      setNotice({ text: messageFrom(error), error: true });
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  const deletePhoto = async (photoId: string) => {
    if (!window.confirm('Are you sure you want to delete this photo?')) return;
    setBusy(true); setNotice(null);
    try {
      await deleteManagedPhoto(photoId).unwrap();
      await refetchPhotos();
      setNotice({ text: 'Photo deleted successfully.' });
    } catch (error) {
      setNotice({ text: messageFrom(error), error: true });
    } finally {
      setBusy(false);
    }
  };

  const setPhotoPrimary = async (photoId: string) => {
    setBusy(true); setNotice(null);
    try {
      await setManagedPrimary(photoId).unwrap();
      await refetchPhotos();
      setNotice({ text: 'Primary profile photo updated.' });
    } catch (error) {
      setNotice({ text: messageFrom(error), error: true });
    } finally {
      setBusy(false);
    }
  };

  const [docType, setDocType] = useState('Government ID');
  const [docFile, setDocFile] = useState<File | null>(null);

  const uploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFile) return;
    setBusy(true); setNotice(null);
    try {
      const data = new FormData();
      data.append('document_type', docType);
      data.append('file', docFile);
      await fetchApi('/member-auth/me/documents/', { method: 'POST', body: data });
      
      const fresh = await fetchApi<UserType>('/member-auth/me/');
      updateUser(fresh);
      setNotice({ text: 'Verification document uploaded successfully and submitted for validation.' });
      setDocFile(null);
      const fileInput = document.getElementById('doc_file_input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error) {
      setNotice({ text: messageFrom(error), error: true });
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault(); setNotice(null);
    if (passwords.new_password !== passwords.confirm) return setNotice({ text: 'New passwords do not match.', error: true });
    setBusy(true);
    try {
      await fetchApi('/member-auth/change-password/', { method: 'POST', body: JSON.stringify(passwords) });
      setPasswords({ old_password: '', new_password: '', confirm: '' });
      setNotice({ text: 'Password changed. Sign in again on your other devices.' });
    } catch (error) { setNotice({ text: messageFrom(error), error: true }); }
    finally { setBusy(false); }
  };

  if (!profile) return <div className="min-h-screen pt-32 text-center text-gray-500">Loading profileâ€¦</div>;
  const status = String(profile.profile_status || 'DRAFT');
  const completion = Number(profile.completion_percentage || 0);

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6"><Link to="/dashboard">Dashboard</Link><ChevronRight className="w-4" /><span>Edit profile</span></div>
        <div className="flex flex-wrap justify-between gap-4 mb-7">
          <div><h1 className="text-2xl font-extrabold">Complete your profile</h1><p className="text-sm text-gray-500">Status: <strong>{status}</strong> Â· {completion}% complete</p></div>
          <div className="flex gap-2 items-center flex-wrap justify-end">
            {status !== 'APPROVED' && <button type="button" disabled={busy} onClick={submitForReview} className="px-5 py-2.5 rounded-full border font-bold flex gap-2 items-center whitespace-nowrap"><Send className="w-4" />{status === 'REJECTED' ? 'Resubmit' : 'Submit for review'}</button>}
            <button type="button" disabled={busy} onClick={save} className="gradient-primary text-white px-5 py-2.5 rounded-full font-bold flex gap-2 items-center whitespace-nowrap"><Save className="w-4" />{busy ? 'Savingâ€¦' : 'Save changes'}</button>
          </div>
        </div>
        {notice && <div className={`mb-5 rounded-xl p-4 ${notice.error ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>{notice.text}</div>}
        {status === 'REJECTED' && Boolean(profile.rejection_reason) && <div className="mb-5 rounded-xl bg-amber-50 text-amber-900 p-4"><strong>Review note:</strong> {String(profile.rejection_reason)}</div>}
        <div className="grid lg:grid-cols-[230px_1fr] gap-6">
          <aside>
            <div className="bg-white rounded-2xl border p-5 text-center mb-4">
              <ProfileImage
                photoId={primaryPhoto?.id}
                src={primaryPhoto?.thumbnail_url ?? '/images/bride-portrait.jpg'}
                variant="thumbnail"
                version={primaryPhoto?.updated_at}
                alt="Profile photo"
                size="md"
                shape="circle"
                gender={typeof profile.gender === 'string' ? profile.gender : undefined}
                className="mx-auto animate-fade-in"
              />
              <button type="button" onClick={() => setActiveTab('photos')} className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-[var(--theme-primary-600)] hover:text-[var(--theme-primary-700)] cursor-pointer">
                <Camera className="w-3.5" /> Manage gallery
              </button>
              <div className="h-2 bg-gray-100 rounded mt-4"><div className="h-full bg-[var(--theme-primary-600)] rounded" style={{ width: `${completion}%` }} /></div>
            </div>
            <nav className="bg-white rounded-2xl border overflow-hidden">{tabs.map(([id, label]) => <button type="button" key={id} onClick={() => setActiveTab(id)} className={`w-full text-left px-4 py-3 text-sm font-semibold border-b ${activeTab === id ? 'bg-[var(--theme-primary-50)] text-[var(--theme-primary-700)]' : ''}`}>{label}</button>)}</nav>
          </aside>
          <section className="bg-white rounded-2xl border p-6 md:p-8">
            {activeTab === 'photos' ? (
              <div className="space-y-6">
                <div>
                  <h2 className="font-bold text-xl flex gap-2 items-center">
                    <Camera className="w-5" /> Manage Profile Photos
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">
                    Upload up to {maxPhotos} photos. The first approved photo will serve as your primary search thumbnail.
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Array.from({ length: maxPhotos }).map((_, index) => {
                      const photoItem = photosList[index];
                      if (photoItem) {
                        return (
                          <div key={photoItem.id} className="relative aspect-[4/5] border rounded-2xl overflow-hidden group bg-gray-50 flex flex-col justify-between animate-fade-in">
                            <ProfileImage
                              photoId={photoItem.id}
                              src={photoItem.thumbnail_url}
                              variant="thumbnail"
                              version={photoItem.updated_at}
                              alt={`Gallery ${index + 1}`}
                              size="full"
                              aspectRatio="4:5"
                              shape="square"
                              gender={typeof profile.gender === 'string' ? profile.gender : undefined}
                              className="absolute inset-0"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => deletePhoto(photoItem.id)}
                                disabled={busy}
                                className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors cursor-pointer"
                                title="Delete Photo"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                              {!photoItem.is_primary && photoItem.status === 'approved' && (
                                <button
                                  type="button"
                                  onClick={() => setPhotoPrimary(photoItem.id)}
                                  disabled={busy}
                                  className="px-3 py-1.5 bg-white text-gray-900 rounded-full text-[10px] font-bold hover:bg-gray-100 transition-colors cursor-pointer"
                                >
                                  Set Primary
                                </button>
                              )}
                            </div>

                            {/* Indicators */}
                            <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                              {photoItem.is_primary && (
                                <span className="px-2 py-0.5 bg-amber-500 text-white text-[9px] font-bold rounded-md shadow">
                                  â˜… Primary
                                </span>
                              )}
                              <span className={`px-2 py-0.5 text-[9px] font-bold rounded-md shadow self-start ${
                                photoItem.status === 'approved' ? 'bg-green-500 text-white' :
                                photoItem.status === 'pending' ? 'bg-yellow-500 text-white' :
                                'bg-red-500 text-white'
                              }`}>
                                {photoItem.status.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        );
                      }

                      // Render upload button for the next available slot
                      const isNextSlot = index === photosList.length;
                      if (isNextSlot) {
                        return (
                          <label key={index} className="aspect-[4/5] border-2 border-dashed border-gray-200 hover:border-[var(--theme-primary-500)] rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-colors group bg-gray-50/50">
                            <Camera className="w-8 h-8 text-gray-400 group-hover:text-[var(--theme-primary-500)] transition-colors mb-2" />
                            <span className="text-[10px] font-bold text-gray-500 group-hover:text-[var(--theme-primary-600)]">Upload Photo</span>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              onChange={uploadPhoto}
                              disabled={busy}
                              className="sr-only"
                            />
                          </label>
                        );
                      }

                      // Render disabled placeholder slots
                      return (
                        <div key={index} className="aspect-[4/5] border border-gray-100 bg-gray-50/30 rounded-2xl flex flex-col items-center justify-center text-gray-300 select-none">
                          <svg className="w-6 h-6 mb-1 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-[9px] font-medium text-gray-300">Empty Slot</span>
                        </div>
                      );
                  })}
                </div>
              </div>
            ) : activeTab === 'security' ? (
              <div className="max-w-lg space-y-8"><form onSubmit={changePassword} className="space-y-4"><h2 className="font-bold text-xl flex gap-2"><Shield />Change password</h2>{[['old_password', 'Current password'], ['new_password', 'New password'], ['confirm', 'Confirm new password']].map(([key, label]) => <label key={key} className="block text-sm font-semibold">{label}<input required type="password" value={passwords[key as keyof typeof passwords]} onChange={(e) => setPasswords((p) => ({ ...p, [key]: e.target.value }))} className="mt-1 w-full rounded-xl border px-4 py-3" /></label>)}<button type="submit" disabled={busy} className="gradient-primary text-white px-5 py-2.5 rounded-full font-bold">Update password</button></form>
                <section className="content-card"><h2 className="font-bold text-xl">Sign out everywhere</h2><p>Revoke every active browser and device session, including this one.</p><button type="button" disabled={busy} onClick={async () => { if (window.confirm('Sign out every device?')) await logoutAll(); }} className="btn-outline">Sign out all devices</button></section>
              </div>
            ) : activeTab === 'verification' ? (
              <div className="space-y-6">
                <div>
                  <h2 className="font-bold text-xl flex gap-2 items-center text-slate-800">
                    <FileText className="w-5 h-5 text-[var(--theme-primary-600)]" /> Verification Documents
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">
                    Upload your identification documents for private account verification. These are never publicly visible to other members.
                  </p>
                </div>

                {/* Status Bar */}
                <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                  profile?.document_status === 'APPROVED' ? 'bg-green-50 border-green-200 text-green-800' :
                  profile?.document_status === 'PENDING' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                  profile?.document_status === 'REJECTED' ? 'bg-red-50 border-red-200 text-red-800' :
                  'bg-slate-50 border-slate-200 text-slate-700'
                }`}>
                  <Shield className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-sm">
                      Verification Status: {String(profile?.document_status || 'NOT SUBMITTED')}
                    </h4>
                    <p className="text-xs mt-1 opacity-90">
                      {profile?.document_status === 'APPROVED' && 'Your account verification has been completed successfully.'}
                      {profile?.document_status === 'PENDING' && 'Your documents are currently waiting for admin review.'}
                      {profile?.document_status === 'REJECTED' && 'Your verification request was rejected. Please review rejection reasons below and re-submit.'}
                      {!profile?.document_status && 'Please upload a government-approved identity document to verify your account.'}
                    </p>
                  </div>
                </div>

                {/* Document List */}
                {((profile?.documents as any[]) || []).length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-bold text-sm text-slate-700">Uploaded Documents</h4>
                    <div className="border border-gray-100 rounded-2xl overflow-hidden divide-y divide-gray-100">
                      {((profile?.documents as any[]) || []).map((doc) => (
                        <div key={doc.id} className="p-4 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div className="space-y-1">
                            <p className="font-semibold text-slate-800 text-sm">{doc.document_type}</p>
                            <p className="text-gray-400">Uploaded on {new Date(doc.uploaded_at).toLocaleDateString()}</p>
                            {doc.rejection_reason && (
                              <p className="text-red-500 font-medium mt-1">Rejection Reason: {doc.rejection_reason}</p>
                            )}
                          </div>
                          <span className={`px-2.5 py-1 rounded-full font-bold self-start sm:self-center ${
                            doc.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                            doc.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {doc.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload Form */}
                <form onSubmit={uploadDocument} className="bg-slate-50/50 border border-slate-100 rounded-2xl p-5 space-y-4 max-w-lg">
                  <h4 className="font-bold text-sm text-slate-700 flex items-center gap-1.5">
                    <Upload className="w-4 h-4" /> Upload New Document
                  </h4>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Document Type</label>
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold focus:outline-none"
                    >
                      <option value="Government ID">Government ID (Aadhaar, Passport, etc.)</option>
                      <option value="Age proof">Age proof</option>
                      <option value="Address proof">Address proof</option>
                      <option value="Education document">Education document</option>
                      <option value="Employment document">Employment document</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Select File</label>
                    <input
                      id="doc_file_input"
                      type="file"
                      required
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                      className="w-full text-xs font-medium text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[var(--theme-primary-50)] file:text-[var(--theme-primary-750)] hover:file:bg-[var(--theme-primary-100)]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={busy || !docFile}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:brightness-110 text-white text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer border-0"
                  >
                    {busy ? 'Uploading...' : 'Submit for Verification'}
                  </button>
                </form>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-5">{sections[activeTab].map((field) => <label key={field.key} className={`text-sm font-semibold ${field.type === 'textarea' ? 'md:col-span-2' : ''}`}>{field.label}{field.type === 'textarea' ? <textarea rows={5} value={form[field.key] || ''} onChange={(e) => setValue(field.key, e.target.value)} className="mt-1 w-full rounded-xl border px-4 py-3" /> : field.type === 'select' ? <select value={form[field.key] || ''} onChange={(e) => setValue(field.key, e.target.value)} className="mt-1 w-full rounded-xl border px-4 py-3">{field.options?.map((value) => <option key={value} value={value}>{value || 'Select'}</option>)}</select> : <input type={field.type || 'text'} value={form[field.key] || ''} onChange={(e) => setValue(field.key, e.target.value)} className="mt-1 w-full rounded-xl border px-4 py-3" />}</label>)}</div>
            )}
          </section>
        </div>
        {notice && !notice.error && <p className="sr-only"><CheckCircle />{notice.text}</p>}
      </div>
    </div>
  );
}
