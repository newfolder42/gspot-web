"use client";

import { useRef, useState } from 'react';
import { convertToWebP } from '@/lib/image';
import { generateFileUrl } from '@/lib/s3';
import { submitHideAndSeekCheckAction } from '@/actions/hideAndSeek';
import { isInGeorgia } from '@/lib/geo';
import { formatDistance } from '@/types/hide-and-seek';
import type { HideAndSeekCheckResultType } from '@/types/hide-and-seek';
import { ACCEPTED_IMAGE_ACCEPT } from '@/lib/upload-config';
import { CameraIcon, CheckmarkCircleIcon, MapPinIcon } from '@/components/icons';

type Stage = 'idle' | 'locating' | 'uploading' | 'success' | 'error';

type Props = {
  postId: number;
  checksRemaining: number;
  onSubmitted?: (result: HideAndSeekCheckResultType) => void;
};

function currentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('no_geolocation'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  });
}

/**
 * A check is device position + a photo. The position is taken here, at submit time, rather
 * than read from the photo's EXIF: camera captures often strip EXIF, and EXIF is editable.
 */
export default function NewCheck({ postId, checksRemaining, onSubmitted }: Props) {
  const [stage, setStage] = useState<Stage>('idle');
  const [result, setResult] = useState<HideAndSeekCheckResultType | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setErrorMsg(null);
    setStage('locating');

    try {
      let position: GeolocationPosition;
      try {
        position = await currentPosition();
      } catch {
        setErrorMsg('მდებარეობა ვერ დადგინდა. ჩართე ლოკაცია და სცადე თავიდან.');
        setStage('error');
        return;
      }

      const coordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      if (!isInGeorgia(coordinates.latitude, coordinates.longitude)) {
        setErrorMsg('შენი მდებარეობა საქართველოს გარეთაა.');
        setStage('error');
        return;
      }

      setStage('uploading');

      const compressed = await convertToWebP(file);
      const signedUrl = await generateFileUrl('hide-and-seek-check');
      const publicUrl = signedUrl.split('?')[0];

      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        body: compressed,
        headers: { 'Content-Type': 'image/webp' },
      });
      if (!uploadRes.ok) throw new Error('upload_failed');

      const response = await submitHideAndSeekCheckAction({ postId, coordinates, imageUrl: publicUrl });

      if (!response.ok) {
        setErrorMsg(
          response.reason === 'out_of_checks'
            ? 'მცდელობები ამოგეწურა.'
            : response.reason === 'game_ended'
              ? 'თამაში დასრულდა.'
              : 'შენახვა ვერ მოხერხდა. სცადე თავიდან.'
        );
        setStage('error');
        return;
      }

      setResult(response.data);
      setStage('success');
      onSubmitted?.(response.data);
    } catch {
      setErrorMsg('შეცდომა მოხდა. სცადე თავიდან.');
      setStage('error');
    }
  };

  if (stage === 'success' && result) {
    return (
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 text-center space-y-2">
        {result.found ? (
          <>
            <CheckmarkCircleIcon className="w-8 h-8 mx-auto text-teal-500" />
            <p className="text-base font-bold text-teal-600 dark:text-teal-400">იპოვე!</p>
            {result.gameEnded && (
              <p className="text-sm text-zinc-500">თამაში ყველასთვის დასრულდა.</p>
            )}
          </>
        ) : (
          <>
            <MapPinIcon className="w-8 h-8 mx-auto text-zinc-400" />
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tabular-nums">
              {formatDistance(result.distanceMeters)}
            </p>
            <p className="text-sm text-zinc-500">დარჩა {result.checksRemaining} მცდელობა</p>
            {result.checksRemaining > 0 && (
              <button
                type="button"
                onClick={() => { setStage('idle'); setResult(null); }}
                className="mt-1 rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                კიდევ ერთი
              </button>
            )}
          </>
        )}
      </div>
    );
  }

  const busy = stage === 'locating' || stage === 'uploading';

  return (
    <div className="space-y-2">
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPTED_IMAGE_ACCEPT}
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy || checksRemaining <= 0}
        className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
      >
        <CameraIcon className="w-5 h-5" />
        {stage === 'locating'
          ? 'მდებარეობა იძებნება...'
          : stage === 'uploading'
            ? 'იგზავნება...'
            : `შემოწმება (${checksRemaining})`}
      </button>

      {errorMsg && <p className="text-sm text-rose-600 dark:text-rose-400 text-center">{errorMsg}</p>}
      <p className="text-xs text-zinc-500 text-center">
        ფოტო თამაშის ბოლომდე მხოლოდ შენ და ავტორს გიჩანთ.
      </p>
    </div>
  );
}
