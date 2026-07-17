'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  X,
  Star,
  Trash2,
  Loader2,
  AlertCircle,
  Check,
  Clock,
  Image as ImageIcon,
  RefreshCw,
} from 'lucide-react';

import ProfileImage from '@/components/profile/ProfileImage';
import { useAuth } from '@/legacy/contexts/AuthContext';
import {
  MAX_PROFILE_PHOTO_BYTES,
  type MemberPhoto,
  useDeletePhotoMutation,
  useGetMyPhotosQuery,
  useReplacePhotoMutation,
  useSetPrimaryPhotoMutation,
  useUploadPhotoMutation,
} from '@/legacy/services/photoApi';

const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const ACCEPTED_IMAGE_NAME = /\.(?:jpe?g|png|webp)$/i;

function selectedFileError(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.has(file.type.toLowerCase()) || !ACCEPTED_IMAGE_NAME.test(file.name)) {
    return 'Please choose a JPEG, PNG, or WebP image.';
  }
  if (file.size > MAX_PROFILE_PHOTO_BYTES) return 'Image size must be 10 MB or smaller.';
  return null;
}

function uploadErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') return 'Failed to upload photo.';
  const record = error as { data?: unknown; message?: unknown };
  if (typeof record.message === 'string') return record.message;
  if (typeof record.data === 'string') return record.data;
  if (record.data && typeof record.data === 'object') {
    const data = record.data as { message?: unknown; detail?: unknown };
    if (typeof data.message === 'string') return data.message;
    if (typeof data.detail === 'string') return data.detail;
  }
  return 'Failed to upload photo.';
}

export default function PhotosPage() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null);
  const [replacingPhotoId, setReplacingPhotoId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { data: photosData, isLoading, refetch } = useGetMyPhotosQuery();
  const [uploadPhoto] = useUploadPhotoMutation();
  const [replacePhoto] = useReplacePhotoMutation();
  const [deletePhoto] = useDeletePhotoMutation();
  const [setPrimary] = useSetPrimaryPhotoMutation();

  const displayPhotos = photosData?.photos ?? [];
  const maxPhotos = photosData?.max_photos ?? 6;
  const canUploadMore = displayPhotos.length < maxPhotos;
  const userGender = typeof user?.gender === 'string' ? user.gender : undefined;

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validationError = selectedFileError(file);
    if (validationError) {
      setError(validationError);
      clearSelectedFile();
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError('');
  };

  const beginReplace = (photoId: string) => {
    setReplaceTargetId(photoId);
    setError('');
    if (replaceInputRef.current) {
      replaceInputRef.current.value = '';
      replaceInputRef.current.click();
    }
  };

  const handleReplaceSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const photoId = replaceTargetId;
    event.target.value = '';
    if (!file || !photoId) {
      setReplaceTargetId(null);
      return;
    }

    const validationError = selectedFileError(file);
    if (validationError) {
      setError(validationError);
      setReplaceTargetId(null);
      return;
    }

    setReplacingPhotoId(photoId);
    setError('');
    try {
      await replacePhoto({ photoId, photo: file }).unwrap();
      await refetch();
    } catch (replaceError) {
      setError(uploadErrorMessage(replaceError));
    } finally {
      setReplacingPhotoId(null);
      setReplaceTargetId(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress(15);
    setError('');

    try {
      await uploadPhoto(selectedFile).unwrap();
      setUploadProgress(100);
      clearSelectedFile();
      await refetch();
    } catch (uploadError) {
      setError(uploadErrorMessage(uploadError));
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (photoId: string) => {
    if (!window.confirm('Are you sure you want to delete this photo?')) return;

    try {
      await deletePhoto(photoId).unwrap();
      await refetch();
    } catch (deleteError) {
      setError(uploadErrorMessage(deleteError));
    }
  };

  const handleSetPrimary = async (photo: MemberPhoto) => {
    if (photo.status !== 'approved') {
      setError('Only approved photos can be set as primary.');
      return;
    }

    try {
      await setPrimary(photo.id).unwrap();
      await refetch();
    } catch (primaryError) {
      setError(uploadErrorMessage(primaryError));
    }
  };

  const getStatusBadge = (status: MemberPhoto['status']) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-bold text-green-700">
            <Check className="h-3 w-3" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-700">
            <X className="h-3 w-3" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700">
            <Clock className="h-3 w-3" />
            Under review
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" role="status" aria-label="Loading profile photos">
        <Loader2 className="h-8 w-8 animate-spin text-rose-500" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 py-12">
      <div className="mx-auto max-w-5xl">
        <input
          ref={replaceInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleReplaceSelect}
          className="hidden"
          aria-label="Choose replacement profile photo"
        />
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="mb-2 text-4xl font-bold text-gray-900">Profile Photos</h1>
          <p className="text-lg text-gray-600">
            Upload up to {maxPhotos} photos. Only approved photos are visible to other members.
          </p>
        </motion.div>

        <AnimatePresence>
          {error ? (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4"
              role="alert"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" aria-hidden="true" />
              <p className="flex-1 font-medium text-red-800">{error}</p>
              <button type="button" onClick={() => setError('')} className="text-red-600 hover:text-red-800" aria-label="Dismiss error">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {canUploadMore ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="rounded-lg border-2 border-dashed border-gray-300 p-8">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileSelect}
                className="hidden"
                aria-label="Choose profile photo to upload"
              />

              {!selectedFile ? (
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-rose-100 to-pink-100">
                    <ImageIcon className="h-8 w-8 text-rose-600" aria-hidden="true" />
                  </div>
                  <h2 className="mb-2 text-lg font-bold text-gray-900">Upload a photo</h2>
                  <p className="mb-4 text-gray-600">JPEG, PNG, or WebP, up to 10 MB. It will be reviewed before other members can see it.</p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 px-6 py-3 font-bold text-white shadow-lg transition-all hover:from-rose-600 hover:to-pink-600"
                  >
                    <Upload className="h-5 w-5" aria-hidden="true" />
                    Choose photo
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-start gap-6 sm:flex-row">
                  <div className="relative w-48 shrink-0">
                    <ProfileImage
                      src={previewUrl}
                      alt={`Preview of ${selectedFile.name}`}
                      size="full"
                      aspectRatio="4:5"
                      shape="rounded"
                      gender={userGender}
                    />
                  </div>

                  <div className="flex-1">
                    <h2 className="mb-2 text-lg font-bold text-gray-900">Ready to upload</h2>
                    <p className="mb-1 text-gray-600"><strong>File:</strong> {selectedFile.name}</p>
                    <p className="mb-4 text-gray-600"><strong>Size:</strong> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>

                    {uploading ? (
                      <div className="mb-4" aria-live="polite">
                        <div className="mb-2 flex items-center justify-between text-sm text-gray-600">
                          <span>Uploading and processing…</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                          <div className="h-full bg-gradient-to-r from-rose-500 to-pink-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                        </div>
                      </div>
                    ) : null}

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={handleUpload}
                        disabled={uploading}
                        className="flex-1 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 px-6 py-2 font-bold text-white shadow-lg transition-all hover:from-rose-600 hover:to-pink-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {uploading ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Uploading…</span> : 'Upload photo'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          clearSelectedFile();
                          setError('');
                        }}
                        disabled={uploading}
                        className="rounded-lg border-2 border-gray-300 px-6 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <p className="mt-4 text-center text-sm text-gray-500">{displayPhotos.length} / {maxPhotos} photos uploaded</p>
          </motion.div>
        ) : null}

        {displayPhotos.length ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <h2 className="mb-6 text-2xl font-bold text-gray-900">Your photos</h2>
            <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
              {displayPhotos.map((photo, index) => (
                <motion.div
                  key={photo.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="relative group"
                >
                  <div className="relative overflow-hidden rounded-lg border-2 border-gray-200 transition-colors hover:border-rose-300">
                    <ProfileImage
                      photoId={photo.id}
                      src={photo.thumbnail_url}
                      variant="thumbnail"
                      version={photo.updated_at}
                      alt={`Profile photo ${index + 1}`}
                      size="full"
                      aspectRatio="4:5"
                      shape="square"
                      gender={userGender}
                    />

                    {photo.is_primary ? (
                      <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-white shadow-lg">
                        <Star className="h-3 w-3 fill-current" aria-hidden="true" />
                        Primary
                      </div>
                    ) : null}

                    <div className="absolute right-3 top-3">{getStatusBadge(photo.status)}</div>

                    <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                      <button
                        type="button"
                        onClick={() => beginReplace(photo.id)}
                        disabled={replacingPhotoId !== null}
                        className="rounded-full bg-blue-500 p-3 text-white shadow-lg transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label={`Replace profile photo ${index + 1}`}
                      >
                        {replacingPhotoId === photo.id ? (
                          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                        ) : (
                          <RefreshCw className="h-5 w-5" aria-hidden="true" />
                        )}
                      </button>
                      {!photo.is_primary && photo.status === 'approved' ? (
                        <button
                          type="button"
                          onClick={() => handleSetPrimary(photo)}
                          className="rounded-full bg-amber-500 p-3 text-white shadow-lg transition-colors hover:bg-amber-600"
                          aria-label={`Set profile photo ${index + 1} as primary`}
                        >
                          <Star className="h-5 w-5" aria-hidden="true" />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => handleDelete(photo.id)}
                        className="rounded-full bg-red-500 p-3 text-white shadow-lg transition-colors hover:bg-red-600"
                        aria-label={`Delete profile photo ${index + 1}`}
                      >
                        <Trash2 className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {photo.status === 'rejected' && photo.rejection_reason ? (
                    <div className="mt-2 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700"><strong>Reason:</strong> {photo.rejection_reason}</div>
                  ) : null}
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : !selectedFile ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="py-16 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-gray-100 to-gray-200">
              <ImageIcon className="h-10 w-10 text-gray-400" aria-hidden="true" />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-gray-900">No photos yet</h2>
            <p className="mb-6 text-gray-600">Upload your first photo to complete your profile and start connecting with matches.</p>
          </motion.div>
        ) : null}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-12 rounded-lg border border-blue-200 bg-blue-50 p-6"
        >
          <h2 className="mb-3 font-bold text-blue-900">Photo guidelines</h2>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><span>Upload clear, recent photos of yourself.</span></li>
            <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><span>Photos must be at least 600 × 750 pixels.</span></li>
            <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><span>JPEG, PNG, and WebP are accepted up to 10 MB.</span></li>
            <li className="flex items-start gap-2"><X className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" /><span>No group photos, blurry images, or inappropriate content.</span></li>
          </ul>
        </motion.div>
      </div>
    </div>
  );
}
