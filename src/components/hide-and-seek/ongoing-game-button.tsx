"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { loadActiveHideAndSeekAction } from '@/actions/hideAndSeek';
import { useCountdown } from './countdown';
import type { ActiveHideAndSeekType } from '@/types/hide-and-seek';
import { EyeIcon } from '../icons';

/** How often we re-check with the server that the game is still running. */
const POLL_MS = 60_000;

function Pill({ game, onExpire }: { game: ActiveHideAndSeekType; onExpire: () => void }) {
  const { label, expired } = useCountdown(game.endsAt, onExpire);
  if (expired) return null;

  return (
    <Link
      href={`/post/${game.postId}`}
      className="flex items-center gap-2.5 rounded-full bg-teal-600 pl-3 pr-4 py-2.5 shadow-lg shadow-teal-900/25 text-white hover:bg-teal-700 transition-colors"
    >
      <span className="relative flex-shrink-0">
        <EyeIcon className="w-5 h-5" />
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-white animate-pulse" aria-hidden="true" />
      </span>
      <span className="flex flex-col leading-tight min-w-0">
        <span className="text-xs font-semibold truncate max-w-[9rem]">
          {game.role === 'host' ? 'შენ იმალები' : `ეძებ ${game.hostAlias}-ს`}
        </span>
        <span className="font-mono tabular-nums text-sm font-bold">{label}</span>
      </span>
      {game.role === 'seeker' && (
        <span className="flex-shrink-0 rounded-full bg-black/20 px-2 py-0.5 text-xs font-semibold tabular-nums">
          {game.checksRemaining}
        </span>
      )}
    </Link>
  );
}

/**
 * Floating badge for the one game the user is in. Mounted app-wide, so it stays with them
 * as they browse. Only one game can ever be active per user, which is why this is a single
 * row rather than a list.
 */
export default function OngoingGameButton() {
  const [game, setGame] = useState<ActiveHideAndSeekType | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const active = await loadActiveHideAndSeekAction();
      if (!cancelled) setGame(active);
    };

    load();
    const id = setInterval(load, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [pathname]);

  if (!game) return null;

  return (
    <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40">
      <Pill game={game} onExpire={() => setGame(null)} />
    </div>
  );
}
