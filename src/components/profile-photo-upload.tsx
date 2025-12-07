"use client"

import { storeContent } from '@/lib/content';
import { generateFileUrl } from '@/lib/s3';
import { useState } from 'react';

export default function ProfilePhotoUpload({ userId }: { userId: number | string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    try {
      const signUrl = await generateFileUrl('profile-photo'); //file.type
      const uploadResponse = await fetch(signUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file to S3');
      }

      const uploadUrl = signUrl.split('?')[0];

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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
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
                  {uploading ? 'იტვირთება...' : 'Click to select or drag a file'}
                </p>
              </label>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setIsOpen(false)}
                disabled={uploading}
                className="flex-1 px-4 py-2 rounded-md border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-60"
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
