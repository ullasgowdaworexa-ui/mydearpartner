'use client';

import { useId, useState } from 'react';

import ProfileImage from '@/components/profile/ProfileImage';
import type { MemberPhoto } from '../../services/photoApi';
import { AdminStatusBadge } from './AdminUI';

interface PhotoModerationGalleryProps {
  photos: MemberPhoto[];
  canApprove: boolean;
  canReject: boolean;
  reviewEnabled?: boolean;
  busyPhotoId?: string | null;
  onApprove: (photoId: string) => Promise<void>;
  onReject: (photoId: string, reason: string) => Promise<void>;
  emptyMessage?: string;
}

export default function PhotoModerationGallery({
  photos,
  canApprove,
  canReject,
  reviewEnabled = true,
  busyPhotoId = null,
  onApprove,
  onReject,
  emptyMessage = 'No pending photo records are available for this review.',
}: PhotoModerationGalleryProps) {
  const reasonIdPrefix = useId();
  const [reasons, setReasons] = useState<Record<string, string>>({});

  if (!photos.length) {
    return (
      <p style={{ margin: 0, color: 'var(--admin-text-muted, #6b7280)', fontSize: '0.875rem' }}>
        {emptyMessage}
      </p>
    );
  }

  return (
    <div
      aria-label="Profile photos awaiting moderation"
      style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}
    >
      {photos.map((photo, index) => {
        const status = photo.status.toLowerCase();
        const pending = status === 'pending';
        const reason = reasons[photo.id] ?? '';
        const reasonId = `${reasonIdPrefix}-${photo.id}`;
        const busy = busyPhotoId === photo.id;
        const anotherPhotoIsBusy = Boolean(busyPhotoId) && !busy;

        return (
          <article
            key={photo.id}
            style={{
              minWidth: 0,
              padding: '0.75rem',
              border: '1px solid var(--admin-line, rgba(0,0,0,0.12))',
              borderRadius: '10px',
              background: 'var(--admin-surface, #fff)',
            }}
          >
            <ProfileImage
              photoId={photo.id}
              variant="image"
              updatedAt={photo.updated_at}
              alt={`Profile photo ${index + 1}`}
              size="full"
              aspectRatio="4:5"
              shape="rounded"
            />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginTop: '0.75rem' }}>
              <AdminStatusBadge status={status} />
              {photo.is_primary ? (
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--admin-text-muted, #6b7280)' }}>
                  Primary
                </span>
              ) : null}
            </div>

            {status === 'rejected' && photo.rejection_reason ? (
              <p style={{ margin: '0.65rem 0 0', color: '#b91c1c', fontSize: '0.8rem' }}>
                <strong>Reason:</strong> {photo.rejection_reason}
              </p>
            ) : null}

            {pending && reviewEnabled && (canApprove || canReject) ? (
              <div style={{ display: 'grid', gap: '0.55rem', marginTop: '0.75rem' }}>
                {canReject ? (
                  <>
                    <label htmlFor={reasonId} style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                      Rejection reason
                    </label>
                    <textarea
                      id={reasonId}
                      value={reason}
                      onChange={(event) => setReasons((current) => ({
                        ...current,
                        [photo.id]: event.target.value,
                      }))}
                      rows={2}
                      maxLength={1000}
                      placeholder="Required before rejecting"
                      disabled={Boolean(busyPhotoId)}
                      style={{
                        width: '100%',
                        resize: 'vertical',
                        padding: '0.5rem',
                        border: '1px solid var(--admin-line, rgba(0,0,0,0.15))',
                        borderRadius: '6px',
                        background: 'transparent',
                        color: 'var(--admin-text, #111827)',
                      }}
                    />
                  </>
                ) : null}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {canApprove ? (
                    <button
                      type="button"
                      className="admin-btn"
                      onClick={() => void onApprove(photo.id)}
                      disabled={Boolean(busyPhotoId)}
                      style={{ background: '#059669', border: 'none', padding: '0.4rem 0.7rem' }}
                    >
                      {busy ? 'Saving…' : 'Approve photo'}
                    </button>
                  ) : null}
                  {canReject ? (
                    <button
                      type="button"
                      className="admin-btn"
                      onClick={() => void onReject(photo.id, reason.trim())}
                      disabled={Boolean(busyPhotoId) || !reason.trim()}
                      style={{ background: '#dc2626', border: 'none', padding: '0.4rem 0.7rem' }}
                    >
                      {busy ? 'Saving…' : 'Reject photo'}
                    </button>
                  ) : null}
                </div>
                {anotherPhotoIsBusy ? (
                  <span className="sr-only">Another photo decision is being saved.</span>
                ) : null}
              </div>
            ) : null}

            {pending && !reviewEnabled ? (
              <p style={{ margin: '0.65rem 0 0', color: 'var(--admin-text-muted, #6b7280)', fontSize: '0.8rem' }}>
                Start this assigned review before making a decision.
              </p>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
