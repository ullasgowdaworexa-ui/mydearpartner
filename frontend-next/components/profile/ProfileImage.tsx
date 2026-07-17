'use client';

import { UserRound } from 'lucide-react';
import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react';

import {
  getAccessToken,
  getFreshAccessToken,
  refreshAccessToken,
} from '@/legacy/services/apiClient';

export type ProfilePhotoVariant = 'image' | 'thumbnail';
export type ProfileImageSize = 'auto' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
export type ProfileImageAspectRatio = '1:1' | '4:5';
export type ProfileImageShape = 'circle' | 'rounded' | 'square';

export interface ProfileImageProps {
  /** The ProfilePhoto UUID. This is the preferred way to load a protected photo. */
  photoId?: string | null;
  /** A photo endpoint returned by the API, or a local object URL for an upload preview. */
  src?: string | null;
  /** Selects the binary endpoint when photoId is supplied. */
  variant?: ProfilePhotoVariant;
  /** Changes the request URL after a replacement or moderation update. */
  version?: string | number | Date | null;
  /** Alias for API `updated_at` values. */
  updatedAt?: string | number | Date | null;
  alt?: string;
  size?: ProfileImageSize;
  aspectRatio?: ProfileImageAspectRatio;
  shape?: ProfileImageShape;
  gender?: 'Male' | 'Female' | 'Other' | string | null;
  className?: string;
  style?: CSSProperties;
  priority?: boolean;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

const SIZE_CLASS: Record<ProfileImageSize, string> = {
  auto: '',
  xs: 'w-8',
  sm: 'w-12',
  md: 'w-24',
  lg: 'w-32',
  xl: 'w-48',
  full: 'w-full',
};

function versionValue(version: ProfileImageProps['version']): string | null {
  if (version === null || version === undefined || version === '') return null;
  if (version instanceof Date) return String(version.getTime());

  if (typeof version === 'string') {
    const timestamp = Date.parse(version);
    return Number.isNaN(timestamp) ? version : String(timestamp);
  }

  return String(version);
}

function withVersion(url: string, version: ProfileImageProps['version']): string {
  const value = versionValue(version);
  if (!value) return url;

  const [path, query = ''] = url.split('?', 2);
  const search = new URLSearchParams(query);
  search.set('v', value);
  return `${path}?${search.toString()}`;
}

/**
 * Builds a same-origin URL so protected image requests can carry the current
 * in-memory access token through the BFF proxy instead of exposing a direct
 * storage or backend URL to an `<img>` element.
 */
export function profilePhotoEndpoint(
  photoId: string,
  variant: ProfilePhotoVariant = 'thumbnail',
  version?: ProfileImageProps['version'],
): string {
  return withVersion(
    `/api/proxy/profile-photos/${encodeURIComponent(photoId)}/${variant}/`,
    version,
  );
}

function protectedEndpointFromSource(source: string, version?: ProfileImageProps['version']): string | null {
  if (source.startsWith('data:')) return null;

  try {
    const parsed = new URL(source, 'https://profile-image.local');
    const match = parsed.pathname.match(/(?:^|\/)profile-photos\/([^/]+)\/(image|thumbnail)\/?$/);
    if (!match) return null;

    return profilePhotoEndpoint(
      decodeURIComponent(match[1]),
      match[2] as ProfilePhotoVariant,
      version ?? parsed.searchParams.get('v'),
    );
  } catch {
    return null;
  }
}

function localImageSource(source: string | null | undefined): string | null {
  if (!source || source.startsWith('data:')) return null;
  if (source.startsWith('blob:') || source.startsWith('/images/') || source.startsWith('/favicon')) return source;
  return null;
}

function placeholderClasses(gender: ProfileImageProps['gender']) {
  switch (gender?.toLowerCase()) {
    case 'female':
      return 'from-pink-100 to-pink-200 text-pink-400';
    case 'male':
      return 'from-blue-100 to-blue-200 text-blue-400';
    default:
      return 'from-slate-100 to-slate-200 text-slate-400';
  }
}

async function fetchProtectedPhoto(endpoint: string, signal: AbortSignal): Promise<Blob> {
  const request = async (token: string | null) => {
    const headers = new Headers({
      Accept: 'image/avif,image/webp,image/*;q=0.8,*/*;q=0.5',
    });
    if (token) headers.set('Authorization', `Bearer ${token}`);

    return fetch(endpoint, {
      headers,
      credentials: 'include',
      signal,
    });
  };

  let token = getAccessToken();
  if (!token) token = await getFreshAccessToken();
  let response = await request(token);

  if (response.status === 401) {
    token = await refreshAccessToken();
    response = await request(token);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!response.ok) {
    throw new Error(`Unable to load profile photo (${response.status}).`);
  }
  if (!contentType.toLowerCase().startsWith('image/')) {
    throw new Error('The profile photo response was not an image.');
  }

  return response.blob();
}

/**
 * Renders a portrait or avatar safely from the authenticated ProfilePhoto
 * endpoints. Private images are fetched as a Blob and rendered through an
 * object URL, so browser image requests never omit the access credential.
 */
export default function ProfileImage({
  photoId,
  src,
  variant = 'thumbnail',
  version,
  updatedAt,
  alt = 'Profile photo',
  size = 'md',
  aspectRatio = '1:1',
  shape = 'rounded',
  gender,
  className = '',
  style,
  priority: _priority,
  onLoad,
  onError,
}: ProfileImageProps) {
  const onErrorRef = useRef(onError);
  const onLoadRef = useRef(onLoad);
  const effectiveVersion = version ?? updatedAt;
  const protectedEndpoint = useMemo(() => {
    if (photoId) return profilePhotoEndpoint(photoId, variant, effectiveVersion);
    return src ? protectedEndpointFromSource(src, effectiveVersion) : null;
  }, [effectiveVersion, photoId, src, variant]);
  const directSource = useMemo(() => localImageSource(src), [src]);
  const [displaySource, setDisplaySource] = useState<string | null>(directSource);
  const [loading, setLoading] = useState(Boolean(protectedEndpoint || directSource));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    onErrorRef.current = onError;
    onLoadRef.current = onLoad;
  }, [onError, onLoad]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    let objectUrl: string | null = null;

    setDisplaySource(directSource);
    setFailed(false);
    setLoading(Boolean(protectedEndpoint || directSource));

    if (!protectedEndpoint) {
      if (!directSource) setLoading(false);
      return () => controller.abort();
    }

    void fetchProtectedPhoto(protectedEndpoint, controller.signal)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        if (!active) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        setDisplaySource(objectUrl);
      })
      .catch((error: unknown) => {
        if (!active || (error instanceof DOMException && error.name === 'AbortError')) return;
        const loadError = error instanceof Error ? error : new Error('Unable to load profile photo.');
        setFailed(true);
        setLoading(false);
        onErrorRef.current?.(loadError);
      });

    return () => {
      active = false;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [directSource, protectedEndpoint]);

  const isCircle = shape === 'circle';
  const ratioClass = isCircle || aspectRatio === '1:1' ? 'aspect-square' : 'aspect-[4/5]';
  const shapeClass = isCircle ? 'rounded-full' : shape === 'square' ? 'rounded-none' : 'rounded-lg';
  const placeholderClass = placeholderClasses(gender);
  const showFallback = !displaySource || failed;

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br ${SIZE_CLASS[size]} ${ratioClass} ${shapeClass} ${className}`}
      style={style}
      aria-busy={loading || undefined}
    >
      {!showFallback && displaySource ? (
        <img
          src={displaySource}
          alt={alt}
          className="h-full w-full object-cover"
          onLoad={() => {
            setLoading(false);
            onLoadRef.current?.();
          }}
          onError={() => {
            const loadError = new Error('The profile photo could not be displayed.');
            setFailed(true);
            setLoading(false);
            onErrorRef.current?.(loadError);
          }}
        />
      ) : (
        <div
          className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br ${placeholderClass}`}
          role={alt ? 'img' : undefined}
          aria-label={alt || undefined}
        >
          <UserRound aria-hidden="true" className={size === 'xs' || size === 'sm' ? 'h-4 w-4' : 'h-12 w-12'} />
          {failed && alt ? <span className="sr-only">{alt} is unavailable.</span> : null}
        </div>
      )}

      {loading ? (
        <div
          className="absolute inset-0 animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200"
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
}
