"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import ZoomableImage from './zoomable-image';
import { formatPhotoTakenDate } from '@/lib/dates';

/** Tallest a single post photo gets. */
const MAX_HEIGHT = '60vh';

/**
 * A gps post's photo, laid out at its own aspect ratio instead of letterboxed in a
 * full-width box. The frame hugs the photo, so the photo-taken stamp sits on the
 * photo's corner rather than out on the page beside a portrait shot.
 *
 * The ratio is only known once the image has loaded; until then it holds the old
 * full-width slot.
 */
export default function PostPhoto({
  src,
  alt,
  dateTaken,
  href,
  zoomable = false,
}: {
  src: string;
  alt: string;
  dateTaken?: string | null;
  /** Feed cards open the post on click. */
  href?: string;
  /** The post page zooms on click instead. */
  zoomable?: boolean;
}) {
  const [ratio, setRatio] = useState<number | null>(null);

  const image = (
    <Image
      src={src}
      alt={alt}
      width={1200}
      height={800}
      className={`w-full object-contain ${ratio ? 'h-full' : 'h-auto max-h-[60vh]'}`}
      onLoad={(e) => {
        const img = e.currentTarget;
        if (img.naturalWidth && img.naturalHeight) setRatio(img.naturalWidth / img.naturalHeight);
      }}
    />
  );

  return (
    <div className="flex justify-center">
      <div
        className="relative w-full"
        style={ratio ? { width: `min(100%, calc(${MAX_HEIGHT} * ${ratio}))`, aspectRatio: ratio } : undefined}
      >
        {zoomable ? (
          <ZoomableImage className="w-full h-full">{image}</ZoomableImage>
        ) : href ? (
          <Link href={href} className="block w-full h-full">{image}</Link>
        ) : (
          image
        )}
        {dateTaken && ratio && (
          <div className="absolute bottom-3 right-3 font-mono text-sm text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)] select-none pointer-events-none tracking-widest">
            {formatPhotoTakenDate(dateTaken)}
          </div>
        )}
      </div>
    </div>
  );
}
