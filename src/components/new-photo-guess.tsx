"use client"

import { useState, useRef } from 'react';
import { extractGPSCorrdinates, convertToWebP } from '@/lib/image';
import { generateFileUrl } from '@/lib/s3';
import { createPhotoGuess, getPhotoCoordinates } from '@/lib/posts';
import { calculatePhotoGuessScore, haversineMeters } from '@/lib/gpsPhotoGuessScore';
import type { PostGuessType } from '@/types/post-guess';
import { CameraIcon, CheckmarkCircleIcon } from '@/components/icons';

type Stage = 'idle' | 'processing' | 'no-gps' | 'success' | 'error';

type Props = {
  postId: number;
  postTitle?: string;
  onClose: () => void;
  onSubmitted?: (guess: PostGuessType) => void;
};

export default function NewPhotoGuess({ postId, onClose, onSubmitted }: Props) {
  const [stage, setStage] = useState<Stage>('idle');
  const [result, setResult] = useState<{ score: number; distance: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStage('processing');
    setErrorMsg(null);

    try {
      const gps = await extractGPSCorrdinates(file);
      if (!gps) {
        setStage('no-gps');
        return;
      }

      const compressed = await convertToWebP(file);
      const signedUrl = await generateFileUrl('guess-photo');
      const publicUrl = signedUrl.split('?')[0];

      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        body: compressed,
        headers: { 'Content-Type': 'image/webp' },
      });
      if (!uploadRes.ok) throw new Error('upload_failed');

      const photoData = await getPhotoCoordinates({ postId });
      if (!photoData?.coordinates) {
        setErrorMsg('პოსტის კოორდინატები ვერ მოიძებნა.');
        setStage('error');
        return;
      }

      const distance = haversineMeters(photoData.coordinates, gps);
      const score = calculatePhotoGuessScore(distance);

      const guess = await createPhotoGuess({ postId, coordinates: gps, distance, score, imageUrl: publicUrl });
      if (!guess) {
        setErrorMsg('გამოცნობის შენახვა ვერ მოხერხდა.');
        setStage('error');
        return;
      }

      setResult({ score, distance });
      setStage('success');
      onSubmitted?.(guess);
    } catch {
      setErrorMsg('შეცდომა მოხდა. სცადე თავიდან.');
      setStage('error');
    }
  };

  const handleRetake = () => {
    setStage('idle');
    setErrorMsg(null);
    setResult(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-layer-modal bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 w-auto min-w-[26rem] max-w-full border border-zinc-200 dark:border-zinc-800 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">გამოცნობა ადგილზე</h2>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          aria-hidden="true"
          onChange={handleFileChange}
        />

        {stage === 'idle' && (
          <>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg p-8 text-center cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-500"
            >
              <CameraIcon className="mx-auto h-7 w-7 text-zinc-400 mb-2" />
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                გადაიღე ფოტო ადგილზე, იქ სადაც ფიქრობ რომ ავტორმა გადაიღო.
              </span>
            </button>
            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                გაუქმება
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-teal-500 text-sm font-medium text-black hover:bg-teal-600"
              >
                <CameraIcon className="w-4 h-4" />
                ფოტოს გადაღება
              </button>
            </div>
          </>
        )}

        {stage === 'processing' && (
          <div className="py-6 flex flex-col items-center gap-3 text-center">
            <CameraIcon className="w-7 h-7 text-zinc-400 dark:text-zinc-500" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">მუშავდება...</p>
          </div>
        )}

        {stage === 'no-gps' && (
          <>
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-md mb-4">
              <p className="text-xs text-red-600 dark:text-red-400">
                ფოტოზე GPS ლოკაცია ვერ მოიძებნა.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                გაუქმება
              </button>
              <button
                type="button"
                onClick={handleRetake}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-teal-500 text-sm font-medium text-black hover:bg-teal-600"
              >
                <CameraIcon className="w-4 h-4" />
                თავიდან სცადე
              </button>
            </div>
          </>
        )}

        {stage === 'success' && result && (
          <>
            <div className="py-2 flex flex-col items-center gap-3 text-center">
              <CheckmarkCircleIcon className="w-10 h-10 text-teal-500" />
              <div className="space-y-0.5">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  ქულა:{' '}
                  <span className="font-semibold text-teal-600 dark:text-teal-400">{result.score}</span>
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  მანძილი: <span className="font-medium text-zinc-800 dark:text-zinc-200">{result.distance} მ</span>
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 rounded-md bg-teal-500 text-sm font-medium text-black hover:bg-teal-600"
              >
                დახურვა
              </button>
            </div>
          </>
        )}

        {stage === 'error' && (
          <>
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-md mb-4">
              <p className="text-xs text-red-600 dark:text-red-400">
                {errorMsg ?? 'შეცდომა მოხდა. სცადე თავიდან.'}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                გაუქმება
              </button>
              <button
                type="button"
                onClick={handleRetake}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-teal-500 text-sm font-medium text-black hover:bg-teal-600"
              >
                <CameraIcon className="w-4 h-4" />
                თავიდან სცადე
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
