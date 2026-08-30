"use client"

import { useEffect } from 'react';
import Image from 'next/image';
import ZoomableImage from './zoomable-image';
import { XIcon } from '@/components/icons';

/**
 * Full-screen viewer for a single image. Thumbnails elsewhere in the UI are rendered
 * from a downscaled variant; opening one here loads the full-size original so it can
 * be inspected, with the same click-to-zoom behaviour post photos have.
 */
export default function ImageLightbox({
  src,
  alt,
  title,
  onClose,
}: {
  src: string;
  alt: string;
  title?: string | null;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-layer-critical bg-black/90 flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={title || alt}
    >
      <div className="flex flex-shrink-0 items-center justify-between gap-2 px-3 py-2">
        <span className="truncate text-sm font-medium text-zinc-200">{title}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="დახურვა"
          title="დახურვა"
          className="p-2 rounded-md bg-zinc-800/80 text-zinc-100 hover:bg-zinc-700 transition"
        >
          <XIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Clicking the backdrop closes; clicks on the image itself zoom instead. */}
      <div className="flex-1 min-h-0 flex items-center justify-center p-2" onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()} className="max-w-full max-h-full">
          <ZoomableImage className="max-w-[95vw] max-h-[85vh]">
            <Image
              src={src}
              alt={alt}
              width={1600}
              height={1200}
              className="max-w-[95vw] max-h-[85vh] w-auto h-auto object-contain"
            />
          </ZoomableImage>
        </div>
      </div>
    </div>
  );
}
