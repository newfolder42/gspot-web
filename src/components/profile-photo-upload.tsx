"use client"

import { storeContent } from '@/lib/content';
import { generateFileUrl } from '@/lib/s3';
import { useState, useRef } from 'react';

export default function ProfilePhotoUpload() {
  const [isOpen, setIsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('გთხოვთ აირჩიოთ მხოლოდ ფოტო-სურათი');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('ფაილის ზომა არ უნდა აღემატებოდეს 5 მბს');
      return;
    }

    setError(null);
    setUploading(true);
    setUploadProgress(0);

    try {
      const signUrl = await generateFileUrl('profile-photo'); //file.type
      const uploadUrl = signUrl.split('?')[0];

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', signUrl, true);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setUploadProgress(Math.round((event.loaded / event.total) * 100));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error('Failed to upload file to S3'));
          }
        };
        xhr.onerror = (err) => reject(new Error(String(err)));
        xhr.send(file);
      });

      const content = await storeContent(
        uploadUrl.split('?')[0],
        'profile-photo',
        {
          originalFileName: file.name,
          fileSize: file.size
        }
      );

      if (content == null) {
        throw new Error('სურათის ატვირთვა ვერ მოხერხდა');
      }

      setIsOpen(false);
      // Reload page to see new photo
      window.location.reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ატვირთვა დახარვეზდა';
      setError(msg);
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  return (
    <>
      {/* Edit icon overlay */}
      <button
        onClick={() => setIsOpen(true)}
        className="absolute bottom-0 right-0 p-1 rounded-full bg-[#00c8ff] hover:bg-[#00b0e6] shadow-md transition"
        title="პროფილის სურათის შეცვლა"
      >
        <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
        </svg>
      </button>

      {/* Modal */}
      {isOpen && (
        <div
          ref={overlayRef}
          onMouseDown={(e) => {
            if (overlayRef.current && e.target === overlayRef.current) setIsOpen(false);
          }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center"
        >
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 w-96 border border-zinc-200 dark:border-zinc-700">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">პროფილის სურათის შეცვლა</h2>

            <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg p-6 text-center">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                disabled={uploading}
                className="hidden"
                id="photo-input"
              />
              <label htmlFor="photo-input" className="cursor-pointer block">
                <svg className="mx-auto h-8 w-8 text-zinc-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {uploading ? 'იტვირთება...' : 'აირჩიე ფოტო-სურათი'}
                </p>
              </label>
            </div>

            {uploading && uploadProgress !== null && (
              <div className="mt-4">
                <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-blue-500 h-3 rounded-full transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <div className="text-xs text-center mt-1 text-zinc-600 dark:text-zinc-300">ატვირთვა: {uploadProgress}%</div>
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setIsOpen(false)}
                disabled={uploading}
                className="flex-1 px-4 py-2 rounded-md border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-60 cursor-pointer"
              >
                გაუქმება
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
