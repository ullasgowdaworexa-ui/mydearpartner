'use client';

import Image, { type ImageProps } from 'next/image';
import { useEffect, useState } from 'react';

import ProfileImage from '@/components/profile/ProfileImage';

type SmartImageProps = Omit<ImageProps, 'src' | 'width' | 'height'> & {
  src?: unknown;
  width?: number;
  height?: number;
  fallbackSrc?: string;
};

function isPrivateProfilePhotoUrl(source: string): boolean {
  try {
    const parsed = new URL(source, 'https://profile-image.local');
    return /(?:^|\/)profile-photos\/[^/]+\/(?:image|thumbnail)\/?$/.test(parsed.pathname);
  } catch {
    return false;
  }
}

export default function SmartImage({
  src,
  alt,
  width = 800,
  height = 800,
  fallbackSrc = '/images/bride-portrait.jpg',
  unoptimized,
  onError,
  className,
  priority,
  style,
  ...props
}: SmartImageProps) {
  const initial = typeof src === 'string' && src.trim() ? src : fallbackSrc;
  const [current, setCurrent] = useState(initial);
  useEffect(() => setCurrent(initial), [initial]);

  // Profile images are protected Django BYTEA endpoints. Next's Image loader
  // cannot attach the in-memory bearer token, so route every existing card,
  // dashboard, shortlist, and chat use through the authenticated Blob loader.
  if (isPrivateProfilePhotoUrl(current)) {
    const hasLayoutClasses = Boolean(className?.match(/(?:^|\s)[wh]-/));
    return (
      <ProfileImage
        src={current}
        alt={alt || 'Profile photo'}
        size="auto"
        aspectRatio={className?.includes('aspect-[4/5]') ? '4:5' : '1:1'}
        shape={className?.includes('rounded-full') ? 'circle' : 'rounded'}
        className={className}
        style={style ?? (hasLayoutClasses ? undefined : { width, height })}
        priority={priority}
      />
    );
  }

  const authorizedOrRemote = current.startsWith('http://') || current.startsWith('https://');
  return <Image
    {...props}
    src={current}
    alt={alt || ''}
    width={width}
    height={height}
    className={className}
    style={style}
    unoptimized={unoptimized ?? authorizedOrRemote}
    onError={(event) => {
      if (current !== fallbackSrc) setCurrent(fallbackSrc);
      onError?.(event);
    }}
  />;
}
