"use client";

import { useEffect, useState } from 'react';
import { giveRewardAction, loadRewardGivingStatusAction } from '@/actions/rewards';
import { getSelectableRewardsForTarget } from '@/types/reward';
import type { RewardGivingStatusType, RewardSummaryType, RewardTarget } from '@/types/reward';
import RewardIcon from './reward-icons';
import { XIcon } from '@/components/icons';

type RewardDialogProps = {
  postId: number;
  commentId: number | null;
  target: RewardTarget;
  onClose: () => void;
  onGiven: (summary: RewardSummaryType) => void;
};

export default function RewardDialog({ postId, commentId, target, onClose, onGiven }: RewardDialogProps) {
  const [status, setStatus] = useState<RewardGivingStatusType | null>(null);
  const [loading, setLoading] = useState(true);
  const [givingKey, setGivingKey] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadRewardGivingStatusAction().then((s) => {
      if (cancelled) return;
      setStatus(s ?? { definitions: [], unlockedKeys: [], dailyLimit: 0, remainingToday: 0 });
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectable = status
    ? getSelectableRewardsForTarget(status.definitions, target).filter((d) => !d.unlockable || status.unlockedKeys.includes(d.key))
    : [];

  // ცხელა/თბილა/ცივა are game flavour, not a compliment — the server exempts them
  // from the daily quota, so the dialog must not gate on it either.
  const countsAgainstQuota = target !== 'hide-and-seek-check';

  const handleGive = async (key: string) => {
    if (givingKey) return;
    if (countsAgainstQuota && status && status.remainingToday <= 0) {
      return;
    }
    setError(false);
    setGivingKey(key);
    try {
      const next = await giveRewardAction(postId, commentId, key);
      if (next) {
        onGiven(next);
        onClose();
      } else {
        setError(true);
      }
    } finally {
      setGivingKey(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-layer-modal flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">ჯილდოს გაცემა</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer"
            aria-label="დახურვა"
            title="დახურვა"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-4">
          {loading ? (
            <div className="py-6 text-center text-sm text-zinc-600 dark:text-zinc-300">იტვირთება...</div>
          ) : selectable.length === 0 ? (
            <div className="py-6 text-center text-sm text-zinc-600 dark:text-zinc-300">
              ჯილდოები ამ ადგილას მიუწვდომელია.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {selectable.map((def) => (
                <button
                  key={def.key}
                  type="button"
                  disabled={!!givingKey}
                  onClick={() => handleGive(def.key)}
                  className="flex flex-col items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 px-2 py-3 hover:border-teal-500/60 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  title={def.name}
                >
                  <RewardIcon iconUrl={def.iconUrl} name={def.name} className="w-9 h-9" />
                  <span className="text-xs font-medium text-zinc-700 dark:text-zinc-200 text-center">{def.name}</span>
                </button>
              ))}
            </div>
          )}

          {error && (
            <p className="mt-3 text-center text-sm text-rose-600 dark:text-rose-400">
              ჯილდოს გაცემა ვერ მოხერხდა. სცადე თავიდან.
            </p>
          )}
        </div>

        {status && countsAgainstQuota && (
          <div className="px-4 py-2 border-t border-zinc-200 dark:border-zinc-800 text-center text-xs text-zinc-400">
            დღეს დარჩენილია {status.remainingToday}/{status.dailyLimit}
          </div>
        )}
      </div>
    </div>
  );
}
