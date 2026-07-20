'use client';

import ProfileImage from '@/components/profile/ProfileImage';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Camera, CheckCircle, ChevronRight, Save, Send, Shield, FileText, Upload,
  AlertCircle, Star, Trash2, RefreshCw, Loader2, XCircle, Mail, Smartphone,
} from 'lucide-react';
import { useAuth, type UserType } from '../contexts/AuthContext';
import { ApiError, fetchApi } from '../services/apiClient';
import ProtectedDocumentViewer from '@/components/documents/ProtectedDocumentViewer';
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

const heightOptions = [
  'Select height',
  "135 cm (4'5\")", "137 cm (4'6\")", "140 cm (4'7\")", "142 cm (4'8\")",
  "145 cm (4'9\")", "147 cm (4'10\")", "150 cm (4'11\")",
  "152 cm (5'0\")", "155 cm (5'1\")", "157 cm (5'2\")", "160 cm (5'3\")",
  "163 cm (5'4\")", "165 cm (5'5\")", "168 cm (5'6\")", "170 cm (5'7\")",
  "173 cm (5'8\")", "175 cm (5'9\")", "178 cm (5'10\")", "180 cm (5'11\")",
  "183 cm (6'0\")", "185 cm (6'1\")", "188 cm (6'2\")", "191 cm (6'3\")",
  "193 cm (6'4\")", "196 cm (6'5\")",
];

const sections: Record<string, FieldConfig[]> = {
  basic: [
    { key: 'first_name', label: 'First name' }, { key: 'last_name', label: 'Last name' },
    { key: 'mobile_number', label: 'Mobile number' }, { key: 'gender', label: 'Gender', type: 'select', options: ['', 'Male', 'Female'] },
    { key: 'profile_created_by', label: 'Profile created by', type: 'select', options: ['', 'Self', 'Parent', 'Sibling', 'Relative', 'Friend'] },
    { key: 'date_of_birth', label: 'Date of birth', type: 'date' }, { key: 'work_location', label: 'Current city' },
    { key: 'about', label: 'About me', type: 'textarea' }, { key: 'hobbies', label: 'Hobbies (comma separated)' },
  ],
  personal: [
    { key: 'marital_status', label: 'Marital status' },
    { key: 'height', label: 'Height', type: 'select', options: heightOptions },
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
    { key: 'pref_height_min', label: 'Minimum height', type: 'select', options: heightOptions },
    { key: 'pref_height_max', label: 'Maximum height', type: 'select', options: heightOptions },
    { key: 'pref_religion', label: 'Preferred religion' }, { key: 'pref_caste', label: 'Preferred caste' },
    { key: 'pref_location', label: 'Preferred locations' }, { key: 'pref_education', label: 'Preferred education' },
    { key: 'pref_occupation', label: 'Preferred occupation' }, { key: 'pref_marital_status', label: 'Preferred marital status' },
    { key: 'pref_about', label: 'About my ideal partner', type: 'textarea' },
  ],
};

const tabs = [
  ['basic', 'Basic & lifestyle'],
  ['photos', 'Manage photos'],
  ['personal', 'Personal & religion'],
  ['family', 'Family'],
  ['career', 'Career & education'],
  ['preferences', 'Partner preferences'],
  ['verification', 'Verification & Documents'],
];

const numberFields = new Set(['num_brothers', 'num_sisters', 'pref_age_min', 'pref_age_max']);

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    approved: 'Approved', pending_review: 'Under Review', rejected: 'Rejected',
    draft: 'Draft', not_started: 'Draft', submitted: 'Submitted',
    changes_requested: 'Changes Requested',
  };
  return map[status?.toLowerCase()] || 'Draft';
}

function statusColor(status: string): string {
  const map: Record<string, string> = {
    approved: 'text-green-600 bg-green-50 border-green-200',
    pending_review: 'text-amber-600 bg-amber-50 border-amber-200',
    rejected: 'text-red-600 bg-red-50 border-red-200',
    changes_requested: 'text-amber-600 bg-amber-50 border-amber-200',
  };
  return map[status?.toLowerCase()] || 'text-gray-500 bg-gray-50 border-gray-200';
}

const messageFrom = (error: unknown) => {
  if (error instanceof ApiError) {
    if (error.errors && typeof error.errors === 'object') {
      const entries = Object.entries(error.errors as Record<string, unknown>);
      const parts: string[] = [];
      for (const [field, msgs] of entries) {
        const label = field.replace(/_/g, ' ');
        const labels = Array.isArray(msgs) ? msgs : [msgs];
        parts.push(`${label}: ${labels.filter(Boolean).join(', ')}`);
      }
      return parts.join('; ') || 'Validation failed.';
    }
    return error.message;
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
  const { user, updateUser, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const profile = user as ProfileUser | null;
  const [activeTab, setActiveTab] = useState('basic');
  const [form, setForm] = useState<FormState>({});
  const [initialForm, setInitialForm] = useState<FormState>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Refresh the authoritative profile in the background so member-level
  // status (e.g. document_status after an admin approval) stays current
  // across client-side navigation. This must NOT gate rendering: the cached
  // auth user is already authoritative and complete, so the page renders
  // immediately and simply adopts the fresher payload when it arrives.
  useEffect(() => {
    let cancelled = false;
    fetchApi<UserType>('/member-auth/me/')
      .then((fresh) => { if (!cancelled) updateUser(fresh); })
      .catch(() => { /* keep cached user on failure */ });
    return () => { cancelled = true; };
  }, []);

  const { data: photosResponse, refetch: refetchPhotos } = useGetMyPhotosQuery();
  const [uploadManagedPhoto] = useUploadPhotoMutation();
  const [deleteManagedPhoto] = useDeletePhotoMutation();
  const [setManagedPrimary] = useSetPrimaryPhotoMutation();
  const photosList = photosResponse?.photos ?? [];
  const primaryPhoto = photosList.find((photo) => photo.is_primary) ?? photosList[0];
  const maxPhotos = photosResponse?.max_photos ?? 6;

  const hasChanges = useMemo(() => {
    for (const key of Object.keys(initialForm)) {
      if (form[key] !== initialForm[key]) return true;
    }
    return false;
  }, [form, initialForm]);

  const profileFields = useMemo(() => Object.values(sections).flat(), []);

  const mapApiToForm = (source: ProfileUser | null): FormState => {
    const next: FormState = {};
    for (const { key } of profileFields) {
      const value = source ? source[key] : undefined;
      next[key] = Array.isArray(value) ? value.join(', ') : value == null ? '' : String(value);
    }
    return next;
  };

  // Adopt authoritative server data into the form on initial load and after
  // a successful save. Never clobber a form the user has already edited: if
  // there are unsaved changes, leave them intact and just refresh the
  // pristine baseline so a later save still diffs correctly.
  const isDirty = (source: FormState) => {
    for (const key of Object.keys(initialForm)) {
      if (source[key] !== initialForm[key]) return true;
    }
    return false;
  };
  useEffect(() => {
    if (!profile) return;
    const next = mapApiToForm(profile);
    if (isDirty(form)) {
      setInitialForm(next);
      return;
    }
    setForm(next);
    setInitialForm(next);
  }, [profile, profileFields]);

  const setValue = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const save = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const payload: Record<string, unknown> = {};
      for (const { key } of profileFields) {
        if (form[key] !== initialForm[key]) {
          payload[key] = numberFields.has(key) ? Number(form[key] || 0) : form[key] || '';
        }
      }
      if (form.hobbies !== initialForm.hobbies) {
        payload.hobbies = (form.hobbies || '').split(',').map((item) => item.trim()).filter(Boolean);
      }
      if (Object.keys(payload).length === 0) {
        setNotice({ text: 'No changes to save.', error: true });
        setBusy(false);
        return;
      }
      const updated = await fetchApi<UserType>('/member-auth/me/', { method: 'PATCH', body: JSON.stringify(payload) });
      updateUser(updated);
      // Re-populate the form from the canonical server response so the
      // just-saved values stay visible and survive a refresh.
      const saved = mapApiToForm(updated as ProfileUser);
      setForm(saved);
      setInitialForm(saved);
      setNotice({ text: 'Profile changes saved successfully.' });
    } catch (error) {
      const friendly =
        error instanceof ApiError && error.errors
          ? 'Please correct the highlighted fields.'
          : "We couldn't save your profile changes. Please try again.";
      setNotice({ text: friendly, error: true });
    } finally {
      setBusy(false);
    }
  };

  const submitForReview = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const updated = await fetchApi<UserType>('/member-auth/me/submit/', { method: 'POST' });
      updateUser(updated);
      setNotice({ text: 'Your profile has been submitted for review.' });
    } catch (error) {
      if (error instanceof ApiError && error.errors && (error.errors as Record<string, unknown>).missing_fields) {
        const missing = (error.errors as Record<string, unknown>).missing_fields as string[];
        const fields = missing.map((f) => f.replace(/_/g, ' '));
        setNotice({ text: `Complete ${fields.length} required field${fields.length > 1 ? 's' : ''}: ${fields.join(', ')}.`, error: true });
      } else {
        setNotice({ text: messageFrom(error), error: true });
      }
    } finally {
      setBusy(false);
    }
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
    setBusy(true);
    setNotice(null);
    try {
      await uploadManagedPhoto(file).unwrap();
      await refetchPhotos();
      setNotice({ text: 'Photo uploaded successfully.' });
    } catch (error) {
      setNotice({ text: messageFrom(error), error: true });
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  const deletePhoto = async (photoId: string) => {
    if (!window.confirm('Are you sure you want to delete this photo?')) return;
    setBusy(true);
    setNotice(null);
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
    setBusy(true);
    setNotice(null);
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

  const [docType, setDocType] = useState('AADHAAR');
  const [customDocName, setCustomDocName] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);

  const uploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFile) return;
    setBusy(true);
    setNotice(null);
    try {
      const data = new FormData();
      data.append('document_type', docType);
      if (docType === 'OTHER' && customDocName.trim()) {
        data.append('custom_document_name', customDocName.trim());
      }
      data.append('file', docFile);
      await fetchApi('/member-auth/me/documents/', { method: 'POST', body: data });
      const fresh = await fetchApi<UserType>('/member-auth/me/');
      updateUser(fresh);
      setNotice({ text: 'Verification document uploaded successfully.' });
      setDocFile(null);
      const fileInput = document.getElementById('doc_file_input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error) {
      setNotice({ text: messageFrom(error), error: true });
    } finally {
      setBusy(false);
    }
  };

  const [viewDoc, setViewDoc] = useState<{ id: string; type: string } | null>(null);
  const [verifyTarget, setVerifyTarget] = useState<'email' | 'mobile' | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [devOtpHint, setDevOtpHint] = useState('');
  const [verifying, setVerifying] = useState(false);

  const sendOtp = async (target: 'email' | 'mobile') => {
    setVerifying(true);
    setNotice(null);
    try {
      const result = await fetchApi<{ expires_in?: number; developer_otp?: string }>(
        `/member-auth/verification/${target}/send-otp/`,
        { method: 'POST' },
      ) as any;
      const data = result?.data || result;
      if (data?.developer_otp) setDevOtpHint(data.developer_otp);
      setVerifyTarget(target);
      setOtpCode('');
    } catch (error) {
      setNotice({ text: messageFrom(error), error: true });
    } finally {
      setVerifying(false);
    }
  };

  const verifyOtp = async () => {
    if (!verifyTarget || !otpCode.trim()) return;
    setVerifying(true);
    setNotice(null);
    try {
      await fetchApi(`/member-auth/verification/${verifyTarget}/verify-otp/`, {
        method: 'POST',
        body: JSON.stringify({ code: otpCode.trim() }),
      });
      const fresh = await fetchApi<UserType>('/member-auth/me/');
      updateUser(fresh);
      setNotice({ text: `${verifyTarget === 'email' ? 'Email' : 'Mobile'} verified successfully!` });
      setVerifyTarget(null);
      setOtpCode('');
      setDevOtpHint('');
    } catch (error) {
      setNotice({ text: messageFrom(error), error: true });
    } finally {
      setVerifying(false);
    }
  };

  if (!profile) {
    if (authLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center pt-16">
          <div className="animate-pulse text-center">
            <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4" />
            <div className="h-4 w-32 bg-gray-200 rounded mx-auto" />
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen flex items-center justify-center pt-16">
        <div className="text-center text-muted">
          <p className="text-lg mb-2">Please sign in to edit your profile.</p>
          <a href="/login" className="text-rose-500 underline">Go to login</a>
        </div>
      </div>
    );
  }

  const status = String(profile.profile_status || 'draft');
  const completion = Number(profile.completion_percentage || 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100">
      {/* Header */}
      <div className="p-6 md:p-8 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-gray-900">Edit Profile</h1>
            <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-xs font-bold ${statusColor(String(profile.profile_status))}`}>
                {profile.profile_status === 'approved' && <CheckCircle className="w-3 h-3" />}
                {profile.profile_status === 'rejected' && <XCircle className="w-3 h-3" />}
                {profile.profile_status === 'changes_requested' && <AlertCircle className="w-3 h-3" />}
                {statusLabel(String(profile.profile_status))}
              </span>
              <span aria-hidden="true" className="text-gray-300">&middot;</span>
              <span>{completion}% complete</span>
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            {status !== 'approved' && (
              <button
                type="button"
                disabled={busy}
                onClick={submitForReview}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 border-amber-200 text-amber-700 font-bold text-xs hover:bg-amber-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {status === 'rejected' ? 'Resubmit for Review' : 'Submit for Review'}
              </button>
            )}
            <button
              type="button"
              disabled={busy || !hasChanges}
              onClick={save}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 text-white font-bold text-xs shadow-md hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {busy ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {notice && (
        <div className={`mx-6 md:mx-8 mt-6 mb-0 rounded-xl p-4 text-sm font-medium border ${
          notice.error ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'
        }`}>
          <div className="flex items-center gap-2">
            {notice.error ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
            {notice.text}
          </div>
        </div>
      )}

      {status === 'rejected' && Boolean(profile.rejection_reason) && (
        <div className="mx-6 md:mx-8 mt-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 p-4 text-sm">
          <strong>Review note:</strong> {String(profile.rejection_reason)}
        </div>
      )}

      <div className="flex flex-col lg:flex-row">
        {/* Sidebar */}
        <aside className="lg:w-56 shrink-0 border-b lg:border-b-0 lg:border-r border-gray-100">
          <div className="p-5 text-center border-b border-gray-100">
            <ProfileImage
              photoId={primaryPhoto?.id}
              src={primaryPhoto?.thumbnail_url}
              variant="thumbnail"
              version={primaryPhoto?.updated_at}
              alt=""
              size="md"
              shape="circle"
              className="mx-auto w-20 h-20 rounded-full"
            />
            <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-400 to-rose-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(completion, 100)}%` }} />
            </div>
            <button type="button" onClick={() => setActiveTab('photos')} className="mt-2 text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 mx-auto">
              <Camera className="w-3 h-3" /> Manage Photos
            </button>
          </div>
          <nav className="py-2">
            {tabs.map(([id, label]) => (
              <button
                type="button"
                key={id}
                onClick={() => setActiveTab(id)}
                className={`w-full text-left px-5 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === id
                    ? 'bg-rose-50 text-rose-700 border-r-2 border-rose-500'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <section className="relative flex-1 min-w-0 p-6 md:p-8">
          {/* Photos Tab */}
          {activeTab === 'photos' ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-rose-500" /> Manage Profile Photos
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  Upload up to {maxPhotos} photos. The first approved photo serves as your public thumbnail.
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Array.from({ length: maxPhotos }).map((_, index) => {
                  const photoItem = photosList[index];
                  if (photoItem) {
                    return (
                      <div key={photoItem.id} className="relative aspect-[4/5] border rounded-2xl overflow-hidden group bg-gray-50">
                        <ProfileImage
                          photoId={photoItem.id}
                          src={photoItem.thumbnail_url}
                          variant="thumbnail"
                          version={photoItem.updated_at}
                          alt={`Photo ${index + 1}`}
                          size="full"
                          aspectRatio="4:5"
                          shape="square"
                          className="absolute inset-0"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => deletePhoto(photoItem.id)}
                            disabled={busy}
                            className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          {!photoItem.is_primary && photoItem.status === 'approved' && (
                            <button
                              type="button"
                              onClick={() => setPhotoPrimary(photoItem.id)}
                              disabled={busy}
                              className="px-3 py-1.5 bg-white text-gray-900 rounded-full text-[10px] font-bold hover:bg-gray-100 transition-colors"
                            >
                              <Star className="w-3 h-3 inline mr-1" />Set Primary
                            </button>
                          )}
                        </div>
                        <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                          {photoItem.is_primary && (
                            <span className="px-2 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-md shadow flex items-center gap-1">
                              <Star className="w-2.5 h-2.5" /> Primary
                            </span>
                          )}
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md shadow ${
                            photoItem.status === 'approved' ? 'bg-green-500 text-white' :
                            photoItem.status === 'pending' ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'
                          }`}>
                            {photoItem.status.toUpperCase()}
                          </span>
                        </div>
                        {photoItem.rejection_reason && (
                          <div className="absolute bottom-0 left-0 right-0 bg-red-500/80 text-white text-[9px] px-2 py-1">
                            {photoItem.rejection_reason}
                          </div>
                        )}
                      </div>
                    );
                  }
                  const isNextSlot = index === photosList.length;
                  if (isNextSlot) {
                    return (
                      <label key={index} className="aspect-[4/5] border-2 border-dashed border-gray-200 hover:border-rose-400 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-colors bg-gray-50/50">
                        <Camera className="w-8 h-8 text-gray-300 group-hover:text-rose-500 mb-2" />
                        <span className="text-[10px] font-bold text-gray-400">Upload Photo</span>
                        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadPhoto} disabled={busy} className="sr-only" />
                      </label>
                    );
                  }
                  return (
                    <div key={index} className="aspect-[4/5] border border-gray-100 bg-gray-50/30 rounded-2xl flex flex-col items-center justify-center text-gray-300 select-none">
                      <Camera className="w-6 h-6 mb-1 text-gray-200" />
                      <span className="text-[9px] font-medium text-gray-200">Empty</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : activeTab === 'verification' ? (
            <div className="space-y-8">
              {/* Contact Verification */}
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                  <Shield className="w-5 h-5 text-rose-500" /> Contact Verification
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Email */}
                  <div className="border border-gray-100 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-semibold text-gray-700">Email</span>
                      </div>
                      {(profile as any)?.is_email_verified ? (
                        <span className="flex items-center gap-1 text-xs font-bold text-emerald-600"><CheckCircle className="w-3.5 h-3.5" /> Verified</span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-bold text-slate-400"><XCircle className="w-3.5 h-3.5" /> Not verified</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{profile?.email}</p>
                    {!(profile as any)?.is_email_verified && (
                      <div className="space-y-2">
                        {verifyTarget === 'email' ? (
                          <div className="flex items-center gap-2">
                            <input type="text" maxLength={6} placeholder="Enter OTP" value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))} className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-200" />
                            <button type="button" onClick={verifyOtp} disabled={verifying || otpCode.length < 4} className="px-3 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold hover:bg-rose-600 transition-colors disabled:opacity-50 cursor-pointer">
                              {verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Verify'}
                            </button>
                          </div>
                        ) : (
                          <button type="button" onClick={() => sendOtp('email')} disabled={verifying} className="w-full py-2 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold hover:bg-rose-100 transition-colors disabled:opacity-50 cursor-pointer">
                            {verifying ? 'Sending...' : 'Send OTP'}
                          </button>
                        )}
                        {verifyTarget === 'email' && devOtpHint && (
                          <p className="text-[10px] text-amber-600 font-medium">Dev OTP: {devOtpHint}</p>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Mobile */}
                  <div className="border border-gray-100 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-semibold text-gray-700">Mobile</span>
                      </div>
                      {(profile as any)?.is_mobile_verified ? (
                        <span className="flex items-center gap-1 text-xs font-bold text-emerald-600"><CheckCircle className="w-3.5 h-3.5" /> Verified</span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-bold text-slate-400"><XCircle className="w-3.5 h-3.5" /> Not verified</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{profile?.mobile_number}</p>
                    {!(profile as any)?.is_mobile_verified && profile?.mobile_number && (
                      <div className="space-y-2">
                        {verifyTarget === 'mobile' ? (
                          <div className="flex items-center gap-2">
                            <input type="text" maxLength={6} placeholder="Enter OTP" value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))} className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-200" />
                            <button type="button" onClick={verifyOtp} disabled={verifying || otpCode.length < 4} className="px-3 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold hover:bg-rose-600 transition-colors disabled:opacity-50 cursor-pointer">
                              {verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Verify'}
                            </button>
                          </div>
                        ) : (
                          <button type="button" onClick={() => sendOtp('mobile')} disabled={verifying} className="w-full py-2 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold hover:bg-rose-100 transition-colors disabled:opacity-50 cursor-pointer">
                            {verifying ? 'Sending...' : 'Send OTP'}
                          </button>
                        )}
                        {verifyTarget === 'mobile' && devOtpHint && (
                          <p className="text-[10px] text-amber-600 font-medium">Dev OTP: {devOtpHint}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* Documents */}
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-rose-500" /> Verification Documents
                </h2>
                <p className="text-sm text-gray-400 mt-1 mb-4">
                  Upload your identification documents for private account verification. Documents will be reviewed by admin.
                </p>
                <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                  (profile as any)?.document_status === 'approved' ? 'bg-green-50 border-green-200 text-green-800' :
                  (profile as any)?.document_status === 'pending_review' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                  (profile as any)?.document_status === 'rejected' ? 'bg-red-50 border-red-200 text-red-800' :
                  'bg-gray-50 border-gray-200 text-gray-700'
                }`}>
                  <Shield className="w-5 h-5 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-bold text-sm">
                      Status: {statusLabel((profile as any)?.document_status)}
                    </h4>
                    <p className="text-xs mt-1 opacity-90">
                      {(profile as any)?.document_status === 'approved' && 'Your account verification has been completed successfully.'}
                      {(profile as any)?.document_status === 'pending_review' && 'Your documents are currently waiting for admin review.'}
                      {(profile as any)?.document_status === 'rejected' && 'Your verification request was rejected. Please re-submit.'}
                      {!(profile as any)?.document_status && 'Please upload a government-approved identity document.'}
                    </p>
                  </div>
                </div>
                {((profile?.documents as any[]) || []).length > 0 && (
                  <div className="space-y-3 mt-4">
                    <h4 className="font-bold text-sm text-gray-700">Uploaded Documents</h4>
                    <div className="border border-gray-100 rounded-2xl overflow-hidden divide-y divide-gray-100">
                      {((profile?.documents as any[]) || []).map((doc: any) => (
                        <div key={doc.id} className="p-4 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div className="space-y-1">
                            <p className="font-semibold text-gray-800 text-sm">{doc.document_type}</p>
                            <p className="text-gray-400">Uploaded on {new Date(doc.uploaded_at).toLocaleDateString()}</p>
                            {doc.rejection_reason && <p className="text-red-500 font-medium mt-1">Reason: {doc.rejection_reason}</p>}
                          </div>
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => setViewDoc({ id: doc.id, type: doc.document_type })} className="px-2.5 py-1 rounded-lg border border-gray-200 font-bold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer">
                              View
                            </button>
                            <span className={`px-2.5 py-1 rounded-full font-bold shrink-0 ${
                              doc.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                              doc.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                            }`}>{doc.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <form onSubmit={uploadDocument} className="bg-gray-50/50 border border-gray-100 rounded-2xl p-5 space-y-4 max-w-lg mt-4">
                  <h4 className="font-bold text-sm text-gray-700 flex items-center gap-1.5">
                    <Upload className="w-4 h-4" /> Upload New Document
                  </h4>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Document Type</label>
                    <select value={docType} onChange={(e) => setDocType(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold">
                      <option value="AADHAAR">Aadhaar Card</option>
                      <option value="PAN">PAN Card</option>
                      <option value="PASSPORT">Passport</option>
                      <option value="DRIVING_LICENCE">Driving Licence</option>
                      <option value="VOTER_ID">Voter ID</option>
                      <option value="BIRTH_CERTIFICATE">Birth Certificate</option>
                      <option value="ADDRESS_PROOF">Address Proof</option>
                      <option value="INCOME_CERTIFICATE">Income Certificate</option>
                      <option value="DEGREE_CERTIFICATE">Degree Certificate</option>
                      <option value="TENTH_MARKSHEET">10th Marks Card</option>
                      <option value="TWELFTH_MARKSHEET">12th Marks Card</option>
                      <option value="DIPLOMA_CERTIFICATE">Diploma Certificate</option>
                      <option value="EMPLOYMENT_PROOF">Employment Proof</option>
                      <option value="SALARY_SLIP">Salary Slip</option>
                      <option value="DIVORCE_CERTIFICATE">Divorce Certificate</option>
                      <option value="DEATH_CERTIFICATE">Death Certificate</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  {docType === 'OTHER' && (
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Document Name</label>
                      <input type="text" value={customDocName} onChange={(e) => setCustomDocName(e.target.value)} placeholder="e.g. Caste Certificate" className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300" />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Select File</label>
                    <input id="doc_file_input" type="file" required accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setDocFile(e.target.files?.[0] || null)} className="w-full text-xs font-medium text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100" />
                  </div>
                  <button type="submit" disabled={busy || !docFile} className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:brightness-110 text-white text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md border-0 cursor-pointer">
                    {busy ? 'Uploading...' : 'Submit for Verification'}
                  </button>
                </form>
              </div>
            </div>
          ) : (
            /* Form Fields */
            <div>
              <div className="grid md:grid-cols-2 gap-5">
                {sections[activeTab]?.map((field) => (
                  <label key={field.key} className={`text-sm font-semibold text-gray-700 ${field.type === 'textarea' ? 'md:col-span-2' : ''}`}>
                    {field.label}
                    {field.type === 'textarea' ? (
                      <textarea rows={5} value={form[field.key] || ''} onChange={(e) => setValue(field.key, e.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300" />
                    ) : field.type === 'select' ? (
                      <select value={form[field.key] || ''} onChange={(e) => setValue(field.key, e.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300">
                        {field.options?.map((value) => (
                          <option key={value} value={value}>{value || `Select ${field.label}`}</option>
                        ))}
                      </select>
                    ) : (
                      <input type={field.type || 'text'} value={form[field.key] || ''} onChange={(e) => setValue(field.key, e.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300" />
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Bottom action bar */}
      <div className="border-t border-gray-100 p-4 md:p-6 flex justify-end gap-3">
        <button
          type="button"
          disabled={busy || !hasChanges}
          onClick={save}
          className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 text-white font-bold text-sm shadow-md hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {busy ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {viewDoc && (
        <ProtectedDocumentViewer
          documentId={viewDoc.id}
          documentType={viewDoc.type}
          onClose={() => setViewDoc(null)}
        />
      )}
    </div>
  );
}
