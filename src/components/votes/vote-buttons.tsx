"use client";

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { toggleVoteAction } from '@/actions/votes';
import type { VoteSummaryType, VoteValue } from '@/types/vote';
import { UpvoteIcon, DownvoteIcon } from '@/components/icons';

type VoteButtonsProps = {
  postId: number;
  commentId?: number | null;
  score?: number;
  userVote?: VoteValue | null;
  isLoggedIn: boolean;
  size?: 'md' | 'sm';
  /** False for a signed-in viewer who is not a member of the zone: the score shows, voting does not. */
  canInteract?: boolean;
};

export default function VoteButtons({
  postId,
  commentId = null,
  score = 0,
  userVote = null,
  isLoggedIn,
  size = 'md',
  canInteract = true,
}: VoteButtonsProps) {
  const [summary, setSummary] = useState<VoteSummaryType>({ score, userVote });
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const blocked = isLoggedIn && !canInteract;
  const blockedTitle = blocked ? 'ხმის მისაცემად საბზონაში უნდა გაწევრიანდე' : undefined;

  const handleVote = async (value: VoteValue) => {
    if (pending || blocked) return;
    if (!isLoggedIn) {
      router.push(`/auth/signin?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    setPending(true);
    try {
      const next = await toggleVoteAction(postId, commentId, value);
      if (next) setSummary(next);
    } finally {
      setPending(false);
    }
  };

  const sm = size === 'sm';
  const iconCls = sm ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const textCls = sm ? 'text-xs' : 'text-sm';

  const upActive = summary.userVote === 1;
  const downActive = summary.userVote === -1;

  return (
    <div className={`inline-flex items-center gap-1 ${textCls} text-zinc-500 dark:text-zinc-400`}>
      <button
        type="button"
        onClick={() => handleVote(1)}
        disabled={pending || blocked}
        title={blockedTitle}
        className={`inline-flex p-0.5 rounded transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          upActive
            ? 'text-teal-600 dark:text-teal-400'
            : 'hover:text-teal-600 dark:hover:text-teal-400'
        }`}
        aria-pressed={upActive}
      >
        <UpvoteIcon className={iconCls} />
      </button>

      <span className={`font-semibold ${
        upActive ? 'text-teal-600 dark:text-teal-400' : downActive ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-600 dark:text-zinc-300'
      }`}>
        {summary.score}
      </span>

      <button
        type="button"
        onClick={() => handleVote(-1)}
        disabled={pending || blocked}
        title={blockedTitle}
        className={`inline-flex p-0.5 rounded transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          downActive
            ? 'text-rose-600 dark:text-rose-400'
            : 'hover:text-rose-600 dark:hover:text-rose-400'
        }`}
        aria-pressed={downActive}
      >
        <DownvoteIcon className={iconCls} />
      </button>
    </div>
  );
}
