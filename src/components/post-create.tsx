"use client"

import { useState, useRef } from 'react';
import Image from 'next/image';
import { createPost } from '@/lib/posts';
import { storeContent } from '@/lib/content';
import { generateFileUrl } from '@/lib/s3';
import { convertToWebP, extractDateTaken, extractGPSCorrdinates } from '@/lib/image';

interface UploadedPhoto {
  key?: string;
  contentId?: number;
  url: string;
  filename: string;
  size: number;
  uploadedAt: Date;
  coordinates?: {
    latitude: number | null;
    longitude: number | null;
  } | null;
  processingGPS?: boolean;
}

const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export default function CreatePost() {
  const [photo, setPhoto] = useState<UploadedPhoto | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError('ხმოლოდ PNG, JPEG, და WebP ფოტო-სურათებია ნებადართული');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setError('ფაილის ზომა არ უნდა აღემატებოდეს 15 მბს');
      return;
    }

    const isMobile = isMobileDevice();

    const coordinates = await extractGPSCorrdinates(file);
    const dateTaken = await extractDateTaken(file);

    if (coordinates == null || coordinates.latitude == null || coordinates.longitude == null) {
      if (isMobile) {
        setError('სურათზე არ მოიძებნა GPS თაგები. გამოიყენეთ კამერა გადასაღებად, არა გალერეა. (მობილური ბრაუზერი შლის GPS მონაცემებს დაცვის მიზნით)');
      } else {
        setError('სურათზე არ მოიძებნა GPS თაგები.');
      }
      return;
    }

    const isInGeorgia = coordinates.latitude >= 41.0 && coordinates.latitude <= 43.5 && coordinates.longitude >= 40.0 && coordinates.longitude <= 46.5;

    if (!isInGeorgia) {
      setError('სურათი უნდა იყოს გადაღებული საქართველოში.');
      return;
    }

    let processedFile = file;

    if (file.type === 'image/png' || file.type === 'image/jpeg') {
      setUploading(true);

      try {
        processedFile = await convertToWebP(file);
      } catch {
        setError('ვერ მოხერხდა სურათის WebP ფორმატში გარდაქმნა');
        return;
      }
    }

    setError(null);
    setUploading(true);
    setUploadProgress(0);

    try {
      const signUrl = await generateFileUrl('gps-photo');

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', signUrl, true);
        xhr.setRequestHeader('Content-Type', processedFile.type);
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setUploadProgress(Math.round((event.loaded / event.total) * 100));
          }
        };
        xhr.onload = async () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const uploadUrl = signUrl.split('?')[0];
            try {
              const content = await storeContent(
                uploadUrl,
                'gps-photo',
                {
                  originalFileName: processedFile.name,
                  fileSize: processedFile.size,
                  coordinates: coordinates,
                  dateTaken: dateTaken ? dateTaken.toISOString() : null,
                }
              );
              if (content == null) {
                throw new Error('ვერ მოხერხდა ფოტო-სურათის ატვირთვა');
              }
              
              const newPhoto: UploadedPhoto = {
                key: undefined,
                contentId: content.id,
                url: `${uploadUrl}`,
                filename: processedFile.name,
                size: processedFile.size,
                uploadedAt: new Date(),
                coordinates: coordinates,
              };

              setPhoto(newPhoto);
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
              resolve();
            } catch (err) {
              reject(err);
            }
          } else {
            reject(new Error('ვერ მოხერხდა ფოტო-სურათის ატვირთვა'));
          }
        };
        xhr.onerror = (err) => reject(new Error('' + err));
        xhr.send(processedFile);
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'ვერ მოხერხდა ფოტო-სურათის ატვირთვა';
      setError(message);
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const CreateCard = ({ photo, uploading, onAddPhoto }: { photo: UploadedPhoto | null; uploading: boolean; onAddPhoto: () => void }) => {
    const [title, setTitle] = useState('');
    const [creating, setCreating] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);
    const [showInfo, setShowInfo] = useState(false);

    const disabled = creating || uploading || !photo || title.trim() === '' || !photo.coordinates;

    return (
      <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md">
        <div className="flex items-center gap-2">
          <button
            onClick={onAddPhoto}
            type="button"
            className="px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-md text-sm bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700"
          >
            <svg
              className="w-5 h-5 text-blue-500 flex-shrink-0"
              fill="currentColor"
            >
              <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
            </svg>
          </button>
          <button
            onClick={() => setShowInfo(!showInfo)}
            type="button"
            className="px-2 py-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            aria-label="ინფორმაცია"
            title="ატვირთვის მოთხოვნები"
          >
            <svg className="w-5 h-5 text-blue-500" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1.25a6.75 6.75 0 1 0 0 13.5 6.75 6.75 0 0 0 0-13.5ZM7.25 4.5a.75.75 0 1 1 1.5 0 .75.75 0 0 1-1.5 0Zm2 7a.75.75 0 0 1-1.5 0V8.25a.75.75 0 0 1 0-1.5h.25a.75.75 0 0 1 .75.75V11.5Z" />
            </svg>
          </button>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="სათაური"
            className="flex-1 rounded-md border border-zinc-200 dark:border-zinc-700 px-3 py-2 bg-white dark:bg-zinc-800 text-sm"
          />
          <button
            disabled={disabled}
            onClick={async () => {
              setLocalError(null);
              if (!photo) return setLocalError('No uploaded photo');
              if (!photo.contentId) return setLocalError('Uploaded photo missing content id');
              if (!photo.coordinates) return setLocalError('GPS coordinates required');
              setCreating(true);
              try {
                await createPost({ title: title.trim(), contentId: photo.contentId });
                window.location.reload();
              } catch (err) {
                setLocalError(err instanceof Error ? err.message : 'ვერ მოხერხდა ფოტო-სურათის ატვირთვა');
              } finally {
                setCreating(false);
              }
            }}
            className={`px-4 py-2 rounded-md text-sm text-white ${disabled ? 'bg-zinc-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {creating ? 'მიმდინარეობს...' : 'ატვირთვა'}
          </button>
        </div>
        {showInfo && (
          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-md text-xs text-zinc-700 dark:text-zinc-300 space-y-1">
            <p className="font-medium text-blue-700 dark:text-blue-400">📋 ატვირთვის მოთხოვნები:</p>
            <p>• დასაშვები: WebP/JPEG/PNG · მაქს 15მბ.</p>
            <p>• GPS თაგები სავალდებულოა და ლოკაცია უნდა იყოს საქართველოში.</p>
            <p>• <strong>მობილურზე:</strong> გამოიყენეთ კამერა, არა გალერეა - ბრაუზერი შლის GPS მონაცემებს!</p>
            <p>• არ გამოიყენოთ გადაზუმული ან შემთხვევითი ფოტო - უნდა ჩანს ამოსაცნობი ადგილი.</p>
            <p>• უპირატესობა მიანიჭე გრძივად გადაღებულ სურათებს.</p>
          </div>
        )}
        {localError && <p className="text-sm text-red-600 mt-2">{localError}</p>}
      </div>
    );
  };

  const MapPreview = ({ coordinates }: { coordinates: UploadedPhoto['coordinates'] }) => {
    if (!coordinates) return null;
    const { latitude, longitude } = coordinates;
    const src = `https://www.google.com/maps?q=${latitude},${longitude}&z=18&output=embed&&maptype=satellite&hl=ka`;
    return (
      <div className="rounded overflow-hidden border border-zinc-200 dark:border-zinc-700">
        <iframe
          title={`map-${latitude}-${longitude}`}
          src={src}
          width="100%"
          height={180}
          loading="lazy"
          className="block"
        />
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        disabled={uploading}
        className="hidden"
      />
      <div className="">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}
        {uploading && uploadProgress !== null && (
          <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-3 overflow-hidden">
            <div
              className="bg-blue-500 h-3 rounded-full transition-all duration-200"
              style={{ width: `${uploadProgress}%` }}
            />
            <div className="text-xs text-center text-zinc-600 dark:text-zinc-300">ატვირთვა: {uploadProgress}%</div>
          </div>
        )}
      </div>

      {(
        <div>
          {
            <CreateCard photo={photo} uploading={uploading} onAddPhoto={() => fileInputRef.current?.click()} />
          }
          {photo && (
            <div className="space-y-2 mt-2">
              <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <svg
                    className="w-5 h-5 text-blue-500 flex-shrink-0"
                    fill="currentColor"
                  >
                    <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">
                      {photo.filename}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {(photo.size / 1024).toFixed(2)} კბ • {photo.coordinates ? `განედი: ${photo.coordinates.latitude?.toFixed(4)}, გრძედი: ${photo.coordinates.longitude?.toFixed(4)}` : 'No GPS data'}
                    </p>
                  </div>
                </div>
                <div className="flex">
                  <button
                    onClick={() => {
                      setPhoto(null);
                    }}
                    className="px-3 py-1 text-sm font-medium bg-red-600 text-white hover:bg-red-700 rounded-md transition flex items-center gap-1"
                    aria-label="წაშლა"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 overflow-hidden">
                <div className="relative w-full h-[320px] bg-zinc-50 dark:bg-zinc-900">
                  <Image
                    src={photo.url}
                    alt={`Uploaded photo ${photo.filename}`}
                    fill
                    sizes="(max-width: 768px) 100vw, 768px"
                    className="object-contain"
                    priority
                  />
                </div>
              </div>

              {photo.coordinates && (
                <div className="">
                  <MapPreview coordinates={photo.coordinates} />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
