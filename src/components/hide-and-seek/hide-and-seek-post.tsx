"use client";

import Link from 'next/link';
import type { HideAndSeekPostType } from '@/types/post';
import Countdown, { useCountdown } from './countdown';
import TimePassed from '../common/time-passed';
import ProfileAvatar from '../common/profileAvatar';
import UserLink from '../common/user-link';
import { EyeIcon, LockIcon, MessageIcon, UpvoteIcon, UsersIcon } from '../icons';

/**
 * A live game keeps the teal ground; a finished one drops to plain white/black so the feed
 * reads at a glance. `ended` is shared with the status pill so the two can never disagree.
 */
const surface = {
  live: 'bg-gradient-to-br from-teal-600 to-teal-900',
  ended: 'bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800',
};

const heading = {
  live: 'text-white',
  ended: 'text-zinc-900 dark:text-zinc-100',
};

const muted = {
  live: 'text-white/80',
  ended: 'text-zinc-500 dark:text-zinc-400',
};

const eyebrow = {
  live: 'bg-black/25 text-white/90',
  ended: 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400',
};

function StatusPill({ post, ended }: { post: HideAndSeekPostType; ended: boolean }) {
  if (ended) {
    return (
      <span className="inline-flex items-center rounded-full bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
        დასრულდა
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 dark:bg-teal-950/60 px-2 py-0.5 text-xs font-semibold text-teal-700 dark:text-teal-300">
      <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" aria-hidden="true" />
      <Countdown endsAt={post.endsAt} />
    </span>
  );
}

/** True once the row says ended, or the clock runs out before the expiry job catches up. */
function useEnded(post: HideAndSeekPostType): boolean {
  const { expired } = useCountdown(post.endsAt);
  return post.gameStatus === 'ended' || expired;
}

export function HideAndSeekGridItem({ post }: { post: HideAndSeekPostType }) {
  const ended = useEnded(post);
  const key = ended ? 'ended' : 'live';

  return (
    <Link href={`/post/${post.id}`} className="block group">
      <div className={`relative w-full pb-[100%] overflow-hidden ${surface[key]}`}>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 text-center">
          <EyeIcon className={`w-8 h-8 ${ended ? 'text-zinc-400' : 'text-white/90'}`} />
          <span className={`text-xs font-semibold line-clamp-3 ${heading[key]}`}>{post.title}</span>
          <StatusPill post={post} ended={ended} />
        </div>
      </div>
    </Link>
  );
}

export function HideAndSeekPost({ post, showZone }: { post: HideAndSeekPostType; showZone?: boolean }) {
  const ended = useEnded(post);
  const key = ended ? 'ended' : 'live';

  return (
    <article className="overflow-hidden">
      <div className="p-2">
        <div className="flex items-center gap-1.5">
          {showZone && (
            <>
              <Link
                href={`/zone/${post.zoneSlug}`}
                className="flex items-center gap-1 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:underline"
              >
                <ProfileAvatar
                  name={post.zoneSlug}
                  photoUrl={post.zoneProfilePhoto}
                  className="w-6 h-6 rounded-md flex-shrink-0"
                  initialsClassName="text-[8px] font-bold"
                  width={24}
                  height={24}
                />
                {post.zoneSlug}
              </Link>
              <span className="text-xs text-zinc-400">•</span>
            </>
          )}
          <UserLink alias={post.author} level={post.authorLevel} className="text-sm" />
          <span className="text-xs text-zinc-400">•</span>
          <TimePassed date={post.date} className="text-xs text-zinc-400" />
          {post.visibility === 'private' && (
            <LockIcon className="w-3.5 h-3.5 text-zinc-400" aria-label="დახურული თამაში" />
          )}
        </div>
      </div>

      <Link href={`/post/${post.id}`} className="block">
        <div className={`relative rounded-lg overflow-hidden px-4 py-8 sm:py-10 ${surface[key]}`}>
          <div className="flex flex-col items-center gap-3 text-center">
            <div
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${eyebrow[key]}`}
            >
              <EyeIcon className="w-4 h-4" />
              დამალობანა
            </div>
            <h2 className={`text-lg sm:text-xl font-bold max-w-md text-balance ${heading[key]}`}>
              {post.title}
            </h2>
            <StatusPill post={post} ended={ended} />
            {post.viewerRole && (
              <span className={`text-xs font-medium ${muted[key]}`}>
                {post.viewerRole === 'host' ? 'შენ იმალები' : 'შენ ეძებ'}
              </span>
            )}
          </div>
        </div>
      </Link>

      <div className="flex items-center gap-4 px-2 py-2 text-sm text-zinc-500">
        <span className="inline-flex items-center gap-1">
          <UsersIcon className="w-4 h-4" />
          {post.playerCount}
        </span>
        <span className="inline-flex items-center gap-1">
          <EyeIcon className="w-4 h-4" />
          {post.foundCount}
        </span>
        <span className="inline-flex items-center gap-1">
          <MessageIcon className="w-4 h-4" />
          {post.commentCount ?? 0}
        </span>
        <span className="inline-flex items-center gap-1">
          <UpvoteIcon className="w-4 h-4" />
          {post.voteScore ?? 0}
        </span>
      </div>
    </article>
  );
}
