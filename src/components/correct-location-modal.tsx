"use client";

import { useEffect, useState } from 'react';
import LocationPicker from '@/components/hide-and-seek/location-picker';
import ZoneRulesList from '@/components/zone-rules-list';
import { correctPostLocationAction } from '@/actions/post-location';
import { getPostGuessMapPoints } from '@/lib/posts';
import { isInGeorgia } from '@/lib/geo';
import { locationErrorMessage } from '@/lib/postLocationMessages';

type Coordinates = { latitude: number; longitude: number };

type Props = {
  postId: number;
  /** The zone's upload rules — what a correct location means here. */
  rules: string[];
  onClose: () => void;
  /** The location was saved; the post is live again. */
  onCorrected: () => void;
};

/**
 * The author of a suspended post gives it its real location. The place the post has now is
 * the red pin; the author clicks the map for the right one, and saving puts the post back in
 * the feeds and re-scores every guess against it.
 */
export default function CorrectLocationModal({ postId, rules, onClose, onCorrected }: Props) {
  // `undefined` while the post's current spot is loading; `null` when it could not be read.
  const [current, setCurrent] = useState<Coordinates | null | undefined>(undefined);
  const [picked, setPicked] = useState<Coordinates | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPostGuessMapPoints(postId)
      .then((data) => {
        if (!cancelled) setCurrent(data.photoCoordinates);
      })
      .catch(() => {
        if (!cancelled) setCurrent(null);
      });
    return () => {
      cancelled = true;
    };
  }, [postId]);

  const pickedInGeorgia = picked !== null && isInGeorgia(picked.latitude, picked.longitude);

  const save = async () => {
    if (!picked || !pickedInGeorgia || saving) return;
    if (!window.confirm('პოსტი ახალი ლოკაციით დაბრუნდება და ყველა გამოცნობის ქულა თავიდან გადაითვლება. გაგრძელება?')) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await correctPostLocationAction(postId, picked);
      if (res.ok) {
        onCorrected();
        onClose();
        return;
      }
      setError(locationErrorMessage(res.error));
    } catch {
      setError(locationErrorMessage('SERVER_ERROR'));
    }
    setSaving(false);
  };

  return (
    <div
      className="fixed inset-0 z-layer-modal bg-black/50 flex items-center justify-center p-4"
      onClick={() => { if (!saving) onClose(); }}
    >
      <div
        className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-5 max-w-2xl w-full max-h-full overflow-y-auto space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">ლოკაციის გასწორება</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          მონიშნე ფოტოს ზუსტი ადგილი რუკაზე. წითელი წერტილი პოსტის ამჟამინდელი ლოკაციაა.
        </p>

        <ZoneRulesList rules={rules} />

        {current === undefined ? (
          <div className="h-64 sm:h-80 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-sm text-zinc-500">
            იტვირთება...
          </div>
        ) : (
          <LocationPicker value={picked} onChange={setPicked} reference={current} />
        )}

        {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-4 py-2 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 disabled:opacity-50"
          >
            გაუქმება
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!pickedInGeorgia || saving}
            className="flex-1 px-4 py-2 rounded-md bg-teal-600 text-white disabled:opacity-50"
          >
            {saving ? 'ინახება...' : 'გასწორება'}
          </button>
        </div>
      </div>
    </div>
  );
}
