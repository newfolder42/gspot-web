"use client";

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import ZoomableImage from '@/components/common/zoomable-image';
import { reviewObjectiveAction } from '@/actions/quests';
import { CheckmarkCircleIcon, XIcon } from '@/components/icons';
import type { PendingObjectiveReviewType } from '@/types/quest';

function PendingObjectiveRow({ item }: { item: PendingObjectiveReviewType }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showReject, setShowReject] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  function approve() {
    setError(null);
    startTransition(async () => {
      const result = await reviewObjectiveAction(item.id, 'approve');
      if (!result.success) {
        setError(result.error ?? 'შეცდომა');
        return;
      }
      router.refresh();
    });
  }

  function reject() {
    setError(null);
    startTransition(async () => {
      const result = await reviewObjectiveAction(item.id, 'reject', rejectionReason.trim() || undefined);
      if (!result.success) {
        setError(result.error ?? 'შეცდომა');
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg space-y-3">
      {item.photoUrl && (
        <ZoomableImage className="w-full h-80 sm:h-[28rem] rounded-md bg-zinc-100 dark:bg-zinc-900">
          <Image src={item.photoVariants?.feed ?? item.photoUrl} alt={item.objectiveTitle ?? ''} fill className="object-contain" />
        </ZoomableImage>
      )}
      <div className="min-w-0">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
          {item.userAlias} - {item.objectiveTitle ?? item.displayText}
        </p>
        {item.objectiveType === 'in_range_location' && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            მანძილი: {item.distanceMeters !== null ? `${Math.round(item.distanceMeters)} მ` : '-'} / {item.radiusMeters ?? '-'} მ
          </p>
        )}
      </div>

      {showReject ? (
        <div className="space-y-2">
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="დაწუნების მიზეზი (არასავალდებულო)"
            rows={2}
            maxLength={500}
            className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none resize-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-600"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowReject(false)}
              disabled={isPending}
              className="px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-600 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              გაუქმება
            </button>
            <button
              type="button"
              onClick={reject}
              disabled={isPending}
              className="px-3 py-1.5 rounded-md bg-red-600 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-50"
            >
              დაწუნება
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={approve}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-teal-600 text-white text-xs font-medium hover:bg-teal-700 disabled:opacity-50"
          >
            <CheckmarkCircleIcon className="w-3.5 h-3.5" />
            დასტური
          </button>
          <button
            type="button"
            onClick={() => setShowReject(true)}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-600 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
          >
            <XIcon className="w-3.5 h-3.5" />
            დაწუნება
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

export default function QuestModerationQueue({
  pendingObjectives,
}: {
  pendingObjectives: PendingObjectiveReviewType[];
}) {
  if (pendingObjectives.length === 0) return null;

  return (
    <div className="space-y-2">
      {pendingObjectives.map((item) => (
        <PendingObjectiveRow key={item.id} item={item} />
      ))}
    </div>
  );
}
