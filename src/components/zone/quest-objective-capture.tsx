"use client"

import { useState, useRef } from 'react';
import { extractGPSCorrdinates, convertToWebP } from '@/lib/image';
import { generateFileUrl } from '@/lib/s3';
import { haversineMeters } from '@/lib/gpsPhotoGuessScore';
import { submitObjectiveCaptureAction } from '@/actions/quests';
import type { CaptureMethod } from '@/actions/quests';
import type { ObjectiveTypeId, ObjectiveConfig, InRangeLocationConfig } from '@/types/quest';
import { CameraIcon, CheckmarkCircleIcon, AlertTriangleIcon } from '@/components/icons';

type Stage = 'idle' | 'processing' | 'no-location' | 'out-of-range' | 'success' | 'error';

type Props = {
  userQuestId: number;
  objectiveId: number;
  type: ObjectiveTypeId;
  config: ObjectiveConfig;
  onClose: () => void;
  onSubmitted?: () => void;
};

function getLiveLocation(): Promise<{ latitude: number; longitude: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

export default function QuestObjectiveCapture({
  userQuestId,
  objectiveId,
  type,
  config,
  onClose,
  onSubmitted,
}: Props) {
  const [stage, setStage] = useState<Stage>('idle');
  const [distance, setDistance] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const locationConfig = type === 'in_range_location' ? (config as InRangeLocationConfig) : null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStage('processing');
    setErrorMsg(null);

    try {
      let coords: { latitude: number; longitude: number } | null = null;
      let captureMethod: CaptureMethod | undefined;

      if (locationConfig) {
        coords = await extractGPSCorrdinates(file);
        captureMethod = 'exif';

        if (!coords) {
          coords = await getLiveLocation();
          captureMethod = 'live_gps';
        }

        if (!coords) {
          setStage('no-location');
          return;
        }

        const dist = haversineMeters(coords, { latitude: locationConfig.latitude, longitude: locationConfig.longitude });
        if (dist > locationConfig.radiusMeters) {
          setDistance(dist);
          setStage('out-of-range');
          return;
        }
      }

      const compressed = await convertToWebP(file);
      const signedUrl = await generateFileUrl('quest-objective-photo');
      const publicUrl = signedUrl.split('?')[0];

      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        body: compressed,
        headers: { 'Content-Type': 'image/webp' },
      });
      if (!uploadRes.ok) throw new Error('upload_failed');

      const result = await submitObjectiveCaptureAction(userQuestId, objectiveId, {
        photoUrl: publicUrl,
        captureMethod,
        capturedLatitude: coords?.latitude,
        capturedLongitude: coords?.longitude,
      });

      if (!result.success) {
        if (result.inRange === false) {
          setDistance(result.distanceMeters ?? null);
          setStage('out-of-range');
          return;
        }
        setErrorMsg(result.error ?? 'შეცდომა მოხდა.');
        setStage('error');
        return;
      }

      setStage('success');
      onSubmitted?.();
    } catch {
      setErrorMsg('შეცდომა მოხდა. სცადე თავიდან.');
      setStage('error');
    }
  };

  const handleRetake = () => {
    setStage('idle');
    setErrorMsg(null);
    setDistance(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const idleHelpText = locationConfig
    ? 'გადაიღე ფოტო ადგილზე, ამოცანის შესასრულებლად.'
    : 'გადაიღე ფოტო ამოცანის შესასრულებლად.';

  return (
    <div className="fixed inset-0 z-layer-modal bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 w-auto min-w-[26rem] max-w-full border border-zinc-200 dark:border-zinc-800 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">ადგილზე გადაღება</h2>

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
                {idleHelpText}
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

        {stage === 'no-location' && (
          <>
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-md mb-4">
              <p className="text-xs text-red-600 dark:text-red-400">
                ლოკაცია ვერ მოიძებნა (არც ფოტოზე, არც ბრაუზერში). დართე წვდომა ლოკაციაზე და სცადე თავიდან.
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

        {stage === 'out-of-range' && (
          <>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-md mb-4 flex items-start gap-2">
              <AlertTriangleIcon className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                შენ ამოცანის ლოკაციიდან {distance !== null ? `${Math.round(distance)} მ-ით` : ''} შორს ხარ. მიდი უფრო ახლოს და სცადე თავიდან.
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

        {stage === 'success' && (
          <>
            <div className="py-2 flex flex-col items-center gap-3 text-center">
              <CheckmarkCircleIcon className="w-10 h-10 text-teal-500" />
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                გაგზავნილია მოდერატორის შესამოწმებლად.
              </p>
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
