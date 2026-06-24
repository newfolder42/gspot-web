"use client"

import { storeContent } from '@/lib/content';
import { generateFileUrl } from '@/lib/s3';
import { ACCEPTED_IMAGE_ACCEPT, ACCEPTED_IMAGE_TYPES, UPLOAD_QUALITY, UPLOAD_SIZE_LIMIT } from '@/lib/upload-config';
import { useId, useRef, useState } from 'react';
import { ImageIcon } from './icons';

type UploadResult = {
  success: boolean;
  error?: string;
};

type UploadCompletePayload = {
  publicUrl: string;
  details: Record<string, unknown>;
};

/** Interactive crop configuration. When omitted the file is uploaded as-is. */
export type CropConfig = {
  /** Width of the interactive crop frame shown in the modal (px) — keep ≤ 340 to fit */
  displayWidth: number;
  /** Height of the interactive crop frame shown in the modal (px) */
  displayHeight: number;
  /** Width of the output canvas written to S3 (px) */
  outputWidth: number;
  /** Height of the output canvas written to S3 (px) */
  outputHeight: number;
};

export type ImageUploadProps = {
  trigger?: 'overlay' | 'button';
  buttonLabel?: string;
  modalTitle?: string;
  /** S3 file type key passed to generateFileUrl */
  fileType?: string;
  /** Max accepted file size in bytes. Defaults to UPLOAD_SIZE_LIMIT.PROFILE_PHOTO (5 MB) */
  maxSizeBytes?: number;
  /**
   * When provided, shows the interactive drag-to-crop UI and outputs a JPEG at
   * UPLOAD_QUALITY.PROFILE_WEBP. When omitted, the validated raw file is uploaded directly.
   */
  crop?: CropConfig;
  onUploadComplete?: (payload: UploadCompletePayload) => Promise<UploadResult>;
  onUploaded?: (publicUrl: string) => void;
};

const DEFAULT_CROP: CropConfig = {
  displayWidth:  240,
  displayHeight: 240,
  outputWidth:   512,
  outputHeight:  512,
};

function clamp(val: number, min: number, max: number) {
  return Math.min(Math.max(val, min), max);
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Failed to process image.'))),
      type,
      quality,
    );
  });
}

export default function ImageUpload({
  trigger = 'overlay',
  buttonLabel = 'სურათის ატვირთვა',
  modalTitle = 'სურათის შეცვლა',
  fileType = 'profile-photo',
  maxSizeBytes = UPLOAD_SIZE_LIMIT.PROFILE_PHOTO,
  crop = DEFAULT_CROP,
  onUploadComplete,
  onUploaded,
}: ImageUploadProps) {
  const inputId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const dragRef = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Resolved crop dimensions (falls back to defaults when crop is provided)
  const cropW = crop?.displayWidth ?? DEFAULT_CROP.displayWidth;
  const cropH = crop?.displayHeight ?? DEFAULT_CROP.displayHeight;

  // Derived crop layout — scale image to cover the crop frame at minimum size
  const scale = naturalSize ? Math.max(cropW / naturalSize.w, cropH / naturalSize.h) : 1;
  const scaledW = naturalSize ? naturalSize.w * scale : cropW;
  const scaledH = naturalSize ? naturalSize.h * scale : cropH;
  const maxOffX = Math.max((scaledW - cropW) / 2, 0);
  const maxOffY = Math.max((scaledH - cropH) / 2, 0);
  const cx = clamp(position.x, -maxOffX, maxOffX);
  const cy = clamp(position.y, -maxOffY, maxOffY);
  // CSS background-position: top-left corner of the image inside the frame
  const bgLeft = (cropW - scaledW) / 2 + cx;
  const bgTop  = (cropH - scaledH) / 2 + cy;

  const resetState = () => {
    setNaturalSize(null);
    setRawFile(null);
    setPosition({ x: 0, y: 0 });
    setSourceUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const closeModal = () => {
    setIsOpen(false);
    setError(null);
    setUploadProgress(null);
    resetState();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type as typeof ACCEPTED_IMAGE_TYPES[number])) {
      setError('მხოლოდ PNG, JPEG, და WebP ფოტო-სურათებია ნებადართული');
      return;
    }
    if (file.size > maxSizeBytes) {
      const mb = Math.round(maxSizeBytes / 1024 / 1024);
      setError(`ფაილის ზომა არ უნდა აღემატებოდეს ${mb} მბს`);
      return;
    }

    setError(null);
    setNaturalSize(null);
    setPosition({ x: 0, y: 0 });
    setRawFile(file);
    setSourceUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  };

  const buildCroppedFile = async (): Promise<File> => {
    if (!rawFile || !naturalSize || !sourceUrl || !crop) throw new Error('No image selected');

    const { displayWidth: dW, displayHeight: dH, outputWidth: oW, outputHeight: oH } = crop;

    // Recalculate from current state captured in closure
    const s = Math.max(dW / naturalSize.w, dH / naturalSize.h);
    const sw = naturalSize.w * s;
    const sh = naturalSize.h * s;
    const mox = Math.max((sw - dW) / 2, 0);
    const moy = Math.max((sh - dH) / 2, 0);
    const px = clamp(position.x, -mox, mox);
    const py = clamp(position.y, -moy, moy);
    const bgl = (dW - sw) / 2 + px;
    const bgt = (dH - sh) / 2 + py;

    // Source rectangle in original image coordinates
    const srcX = clamp(-bgl / s, 0, naturalSize.w);
    const srcY = clamp(-bgt / s, 0, naturalSize.h);
    const srcW = dW / s;
    const srcH = dH / s;

    const img = new Image();
    await new Promise<void>((res, rej) => {
      img.onload  = () => res();
      img.onerror = () => rej(new Error('Failed to load image for crop'));
      img.src = sourceUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width  = oW;
    canvas.height = oH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, oW, oH);

    const blob = await canvasToBlob(canvas, 'image/webp', UPLOAD_QUALITY.PROFILE_WEBP);
    return new File([blob], rawFile.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' });
  };

  const handleUpload = async () => {
    if (!rawFile) {
      setError('აირჩიე სურათი');
      return;
    }
    if (crop && !naturalSize) {
      setError('სურათი ჯერ არ არის ჩატვირთული');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const processed = crop ? await buildCroppedFile() : rawFile;
      const signUrl   = await generateFileUrl(fileType);
      const publicUrl = signUrl.split('?')[0];

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', signUrl, true);
        xhr.setRequestHeader('Content-Type', processed.type);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300
            ? resolve()
            : reject(new Error('Failed to upload file to S3'));
        xhr.onerror = () => reject(new Error('Failed to upload file to S3'));
        xhr.send(processed);
      });

      const details = { originalFileName: rawFile.name, fileSize: processed.size };

      if (onUploadComplete) {
        const result = await onUploadComplete({ publicUrl, details });
        if (!result.success) throw new Error(result.error ?? 'ატვირთვა დახარვეზდა');
      } else {
        const content = await storeContent(publicUrl, 'profile-photo', details);
        if (!content) throw new Error('სურათის ატვირთვა ვერ მოხერხდა');
      }

      closeModal();
      if (onUploaded) onUploaded(publicUrl);
      else window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ატვირთვა დახარვეზდა');
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!naturalSize || uploading) return;
    dragRef.current = { sx: e.clientX, sy: e.clientY, px: position.x, py: position.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.sx;
    const dy = e.clientY - dragRef.current.sy;
    setPosition({
      x: clamp(dragRef.current.px + dx, -maxOffX, maxOffX),
      y: clamp(dragRef.current.py + dy, -maxOffY, maxOffY),
    });
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <>
      {trigger === 'overlay' ? (
        <button
          onClick={() => setIsOpen(true)}
          className="absolute bottom-0 right-0 p-1 rounded-full bg-teal-600 hover:bg-teal-700 text-white shadow-md transition"
          title={modalTitle}
        >
          <ImageIcon className="w-4 h-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-900 dark:text-zinc-100 transition hover:bg-zinc-50 dark:hover:bg-zinc-700"
        >
          {buttonLabel}
        </button>
      )}

      {isOpen && (
        <div
          ref={overlayRef}
          onMouseDown={(e) => {
            if (overlayRef.current && e.target === overlayRef.current) closeModal();
          }}
          className="fixed inset-0 z-layer-modal bg-black/60 flex items-center justify-center p-4"
        >
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 w-auto min-w-[26rem] max-w-full border border-zinc-200 dark:border-zinc-800 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">{modalTitle}</h2>

            {/* File picker */}
            <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg p-4 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_IMAGE_ACCEPT}
                onChange={handleFileSelect}
                disabled={uploading}
                className="hidden"
                id={inputId}
              />
              <label
                htmlFor={inputId}
                className={`block ${uploading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
              >
                <svg className="mx-auto h-7 w-7 text-zinc-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  {rawFile ? rawFile.name : 'აირჩიე სურათი (PNG, JPEG, WebP)'}
                </span>
              </label>
            </div>

            {/* Hidden img used only to read natural dimensions */}
            {sourceUrl && !naturalSize && (
              <img
                src={sourceUrl}
                className="hidden"
                alt=""
                onLoad={(e) => {
                  const img = e.currentTarget;
                  setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
                }}
              />
            )}

            {/* Crop frame — only shown when crop config is provided */}
            {crop && sourceUrl && naturalSize && (
              <div className="mt-4">
                <div
                  className="mx-auto rounded-md overflow-hidden cursor-move touch-none select-none relative"
                  style={{ width: cropW, height: cropH }}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                >
                  {/* image layer */}
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage: `url(${sourceUrl})`,
                      backgroundSize: `${scaledW}px ${scaledH}px`,
                      backgroundPosition: `${bgLeft}px ${bgTop}px`,
                      backgroundRepeat: 'no-repeat',
                    }}
                  />
                  {/* border overlay */}
                  <div className="absolute inset-0 border-2 border-white/70 rounded-md pointer-events-none" />
                </div>
                <p className="mt-2 text-xs text-center text-zinc-500 dark:text-zinc-400">
                  გადაადგილე სურათი, რათა მოარგო ჩარჩოს.
                </p>
              </div>
            )}

            {uploading && uploadProgress !== null && (
              <div className="mt-4">
                <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-teal-500 h-2 rounded-full transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-center mt-1 text-zinc-500 dark:text-zinc-400">ატვირთვა: {uploadProgress}%</p>
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={closeModal}
                disabled={uploading}
                className="flex-1 px-4 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                გაუქმება
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={uploading || !rawFile || (crop ? !naturalSize : false)}
                className="flex-1 px-4 py-2 rounded-md bg-teal-500 text-sm font-medium text-black hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                შენახვა
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
