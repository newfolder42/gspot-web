"use client";

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { RewardCountType, RewardSummaryType, RewardTarget } from '@/types/reward';
import RewardIcon from './reward-icons';
import RewardDetailsModal from './reward-details-modal';
import RewardDialog from './reward-dialog';
import { GiftIcon } from '@/components/icons';

type RewardButtonProps = {
  postId: number;
  commentId?: number | null;
  target: RewardTarget;
  rewards?: RewardCountType[];
  userReward?: string | null;
  isLoggedIn: boolean;
  size?: 'md' | 'sm';
};

export default function RewardButton({
  postId,
  commentId = null,
  target,
  rewards = [],
  userReward = null,
  isLoggedIn,
  size = 'md',
}: RewardButtonProps) {
  const [summary, setSummary] = useState<RewardSummaryType>({ rewards, userReward });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const chips = summary.rewards.filter((r) => r.count > 0);

  const sm = size === 'sm';
  const chipBase = sm
    ? 'inline-flex items-center gap-1 h-6 px-1.5 rounded-full text-xs'
    : 'inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full text-sm';
  const iconChipBase = sm
    ? 'inline-flex items-center justify-center h-6 w-6 rounded-full text-xs'
    : 'inline-flex items-center justify-center h-8 w-8 rounded-full text-sm';
  const iconCls = sm ? 'w-3.5 h-3.5' : 'w-4 h-4';

  const handleOpenDialog = () => {
    if (!isLoggedIn) {
      router.push(`/auth/signin?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    setDialogOpen(true);
  };

  return (
    <div className="relative inline-flex items-center gap-1.5 flex-wrap">
      {chips.length > 0 && (
        <button
          type="button"
          onClick={() => setDetailsOpen(true)}
          className={`${chipBase} border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/70 text-zinc-700 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors cursor-pointer`}
          title="ჯილდოს გამცემები"
        >
          {chips.map((r) => (
            <span key={r.key} className="inline-flex items-center gap-0.5">
              <RewardIcon iconUrl={r.iconUrl} name={r.name} className={iconCls} />
              <span className="font-semibold">{r.count}</span>
            </span>
          ))}
        </button>
      )}

      {!summary.userReward && (
        <button
          type="button"
          onClick={handleOpenDialog}
          className={`${iconChipBase} border border-dashed border-zinc-300 dark:border-zinc-600 text-zinc-500 dark:text-zinc-400 hover:text-teal-600 dark:hover:text-teal-400 hover:border-teal-500/60 transition-colors cursor-pointer`}
          title="ჯილდოს გაცემა"
          aria-label="ჯილდოს გაცემა"
        >
          <GiftIcon className={iconCls} />
        </button>
      )}

      {dialogOpen && (
        <RewardDialog
          postId={postId}
          commentId={commentId}
          target={target}
          onClose={() => setDialogOpen(false)}
          onGiven={setSummary}
        />
      )}

      {detailsOpen && (
        <RewardDetailsModal postId={postId} commentId={commentId} onClose={() => setDetailsOpen(false)} />
      )}
    </div>
  );
}
