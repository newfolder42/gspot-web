"use client";

import Link from 'next/link';
import type { ReactNode } from 'react';
import VoteButtons from './votes/vote-buttons';
import RewardButton from './rewards/reward-button';
import { MapPinIcon, MessageIcon } from './icons';
import type { RewardCountType } from '@/types/reward';
import type { VoteValue } from '@/types/vote';

type PostActionBarProps = {
  postId: number;
  voteScore: number;
  userVote: VoteValue | null;
  rewards: RewardCountType[];
  userReward: string | null;
  isLoggedIn: boolean;
  /** gps posts only; leave out for quest completions. */
  guessCount?: number | null;
  commentCount: number;
  /** Feed cards link the counts through to the post; the post page shows them plain. */
  href?: string;
};

function Stat({ href, title, children }: { href?: string; title: string; children: ReactNode }) {
  const className = 'inline-flex items-center gap-1';
  return href ? (
    <Link href={href} title={title} className={`${className} hover:text-teal-600 dark:hover:text-teal-400 transition-colors`}>
      {children}
    </Link>
  ) : (
    <span title={title} className={className}>{children}</span>
  );
}

/** Votes, rewards, guesses and comments for a post — the same row on the post page and the feed cards. */
export default function PostActionBar({
  postId,
  voteScore,
  userVote,
  rewards,
  userReward,
  isLoggedIn,
  guessCount,
  commentCount,
  href,
}: PostActionBarProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <VoteButtons
        postId={postId}
        commentId={null}
        score={voteScore}
        userVote={userVote}
        isLoggedIn={isLoggedIn}
        size="md"
      />
      <RewardButton
        postId={postId}
        commentId={null}
        target="post"
        rewards={rewards}
        userReward={userReward}
        isLoggedIn={isLoggedIn}
        size="md"
      />
      <span className="inline-flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
        {guessCount != null && (
          <Stat href={href} title="გამოცნობები">
            <MapPinIcon className="w-4 h-4" />
            <span className="font-semibold">{guessCount}</span>
          </Stat>
        )}
        <Stat href={href} title="კომენტარები">
          <MessageIcon className="w-4 h-4" />
          <span className="font-semibold">{commentCount}</span>
        </Stat>
      </span>
    </div>
  );
}
