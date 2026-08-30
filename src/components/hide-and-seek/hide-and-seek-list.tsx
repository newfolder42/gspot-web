"use client";

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Countdown from './countdown';
import TimePassed from '../common/time-passed';
import UserLink from '../common/user-link';
import { formatMinutes } from '@/types/hide-and-seek';
import type { HideAndSeekListFilter, HideAndSeekListItemType } from '@/types/hide-and-seek';
import { EyeIcon, LockIcon, PlusIcon, UsersIcon } from '../icons';

const FILTERS: { key: HideAndSeekListFilter; label: string }[] = [
  { key: 'all', label: 'ყველა' },
  { key: 'active', label: 'მიმდინარე' },
  { key: 'ended', label: 'დასრულებული' },
];

function GameRow({ game }: { game: HideAndSeekListItemType }) {
  const live = game.status === 'active';

  return (
    <li>
      <Link
        href={`/post/${game.postId}`}
        className="flex items-start gap-3 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
      >
        <span
          className={`flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg ${
            live ? 'bg-teal-600 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
          }`}
        >
          <EyeIcon className="w-5 h-5" />
        </span>

        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-zinc-900 dark:text-zinc-50 truncate">{game.title}</span>
            {game.visibility === 'private' && (
              <LockIcon className="w-3.5 h-3.5 text-zinc-400" aria-label="დახურული თამაში" />
            )}
            {game.viewerRole && (
              <span className="rounded-full bg-teal-50 dark:bg-teal-950/50 px-1.5 py-0.5 text-[11px] font-semibold text-teal-700 dark:text-teal-300">
                {game.viewerRole === 'host' ? 'შენ იმალები' : 'შენ ეძებ'}
              </span>
            )}
          </span>

          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-500">
            <UserLink alias={game.hostAlias} level={game.hostLevel} className="text-xs" />
            <span className="text-zinc-400">•</span>
            <span>{game.zoneSlug}</span>
            <span className="text-zinc-400">•</span>
            <TimePassed date={game.createdAt} className="text-xs text-zinc-400" />
          </span>

          <span className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
            <span className="inline-flex items-center gap-1">
              <UsersIcon className="w-3.5 h-3.5" />
              {game.playerCount}
            </span>
            <span>{game.foundCount} იპოვა</span>
            <span>{formatMinutes(game.durationMinutes)}</span>
          </span>
        </span>

        <span className="flex-shrink-0 text-right">
          {live ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 dark:bg-teal-950/60 px-2 py-0.5 text-xs font-semibold text-teal-700 dark:text-teal-300">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" aria-hidden="true" />
              <Countdown endsAt={game.endsAt} />
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              დასრულდა
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}

export default function HideAndSeekList({
  games,
  filter,
}: {
  games: HideAndSeekListItemType[];
  filter: HideAndSeekListFilter;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setFilter = (next: HideAndSeekListFilter) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'all') params.delete('filter');
    else params.set('filter', next);
    const qs = params.toString();
    router.push(qs ? `/hide-and-seek?${qs}` : '/hide-and-seek');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-xl font-bold text-zinc-900 dark:text-zinc-50">
          <EyeIcon className="w-6 h-6 text-teal-600 dark:text-teal-400" />
          დამალობანა
        </h1>
        <Link
          href="/submit?tab=hide-and-seek"
          className="inline-flex items-center gap-1.5 rounded-md bg-teal-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-700"
        >
          <PlusIcon className="w-4 h-4" />
          ახალი
        </Link>
      </div>

      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            aria-pressed={filter === f.key}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === f.key
                ? 'bg-teal-600 text-white'
                : 'border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {games.length === 0 ? (
        <p className="py-10 text-center text-sm text-zinc-500">
          {filter === 'active' ? 'მიმდინარე თამაში არ არის.' : 'თამაში ჯერ არ არის.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {games.map((g) => (
            <GameRow key={g.gameId} game={g} />
          ))}
        </ul>
      )}
    </div>
  );
}
