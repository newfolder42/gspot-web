"use client";

import Image from 'next/image';
import { getInitials } from '@/lib/getInitials';
import { getProfileColors } from '@/lib/profileColors';

type Props = {
  name: string;
  photoUrl?: string | null;
  alt?: string;
  fallbackText?: string;
  colorKey?: string;
  positionClassName?: string;
  className?: string;
  initialsClassName?: string;
  width?: number;
  height?: number;
};

export default function ProfileAvatar({
  name,
  photoUrl,
  alt,
  fallbackText,
  colorKey,
  positionClassName = 'relative',
  className = '',
  initialsClassName = 'text-sm font-bold',
  width = 48,
  height = 48,
}: Props) {
  const hasPhoto = Boolean(photoUrl);
  const colors = getProfileColors(colorKey ?? name ?? 'user');

  const rootClassName = [
    `${positionClassName} overflow-hidden flex items-center justify-center`,
    hasPhoto ? 'bg-zinc-50 dark:bg-zinc-950' : `${colors.icon} text-white`,
    className,
  ].join(' ');

  return (
    <div className={rootClassName}>
      {hasPhoto ? (
        <Image
          src={photoUrl!}
          alt={alt ?? `${name} profile photo`}
          width={width}
          height={height}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className={initialsClassName}>{fallbackText ?? getInitials(name)}</span>
      )}
    </div>
  );
}
