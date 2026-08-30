"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import NewCheck from './new-check';
import { useCountdown } from './countdown';
import UserLink from '../common/user-link';
import { endHideAndSeekAction, joinHideAndSeekAction } from '@/actions/hideAndSeek';
import { formatDistance, formatMinutes } from '@/types/hide-and-seek';
import type {
  HideAndSeekCheckResultType,
  HideAndSeekGameType,
  HideAndSeekPlayerType,
} from '@/types/hide-and-seek';
import { CheckmarkCircleIcon, LockIcon, EyeIcon, UsersIcon } from '../icons';

type Props = {
  game: HideAndSeekGameType;
  players: HideAndSeekPlayerType[];
  currentUserId: number | null;
};

function PlayerRow({ player, isSelf }: { player: HideAndSeekPlayerType; isSelf: boolean }) {
  return (
    <li
      className={`flex items-center justify-between gap-3 rounded-md px-2.5 py-2 ${
        isSelf ? 'bg-teal-50 dark:bg-teal-950/40' : ''
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {player.status === 'found' && (
          <CheckmarkCircleIcon className="w-4 h-4 flex-shrink-0 text-teal-500" />
        )}
        <UserLink alias={player.alias} level={player.level} className="text-sm truncate" />
      </div>
      <div className="flex items-center gap-3 flex-shrink-0 text-sm">
        {player.status === 'found' ? (
          <span className="font-semibold text-teal-600 dark:text-teal-400">იპოვა</span>
        ) : (
          <span className="tabular-nums text-zinc-600 dark:text-zinc-400">
            {player.lastDistance != null ? formatDistance(player.lastDistance) : '-'}
          </span>
        )}
        <span className="tabular-nums text-xs text-zinc-400">{player.checkCount}</span>
      </div>
    </li>
  );
}

export default function HideAndSeekPanel({ game, players, currentUserId }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localExpired, setLocalExpired] = useState(false);

  const { label, expired } = useCountdown(game.endsAt, () => setLocalExpired(true));

  const isHost = currentUserId != null && currentUserId === game.hostId;
  const viewer = game.viewer;
  // the server is the authority, but the clock drops the UI to "ended" without waiting
  // for the expiry job's next minute
  const live = game.status === 'active' && !expired && !localExpired;

  const join = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);

    const result = await joinHideAndSeekAction(game.postId);
    setBusy(false);

    if (!result.ok) {
      setError(
        result.reason === 'already_in_game'
          ? 'უკვე სხვა დამალობანაში ხარ, ჯერ ის დაასრულე.'
          : result.reason === 'game_ended'
            ? 'თამაში დასრულდა.'
            : 'ვერ ჩაერთე. სცადე თავიდან.'
      );
      return;
    }

    router.refresh();
  };

  const endGame = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);

    const result = await endHideAndSeekAction(game.postId);
    setBusy(false);

    if (!result.ok) {
      setError('ვერ დასრულდა. სცადე თავიდან.');
      return;
    }

    router.refresh();
  };

  const handleChecked = (result: HideAndSeekCheckResultType) => {
    if (result.found) router.refresh();
  };

  const foundCount = players.filter((p) => p.status === 'found').length;

  return (
    <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <div
        className={`px-4 py-4 ${
          live
            ? 'bg-gradient-to-br from-teal-600 to-teal-900'
            : 'bg-white dark:bg-black border-b border-zinc-200 dark:border-zinc-800'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${live ? 'text-white/80' : 'text-zinc-500 dark:text-zinc-400'}`}>
              <EyeIcon className="w-4 h-4" />
              დამალობანა
              {game.visibility === 'private' && <LockIcon className="w-3.5 h-3.5" />}
            </div>
            <h2 className={`mt-1 text-lg font-bold text-balance ${live ? 'text-white' : 'text-zinc-900 dark:text-zinc-100'}`}>
              {game.title}
            </h2>
            <p className={`mt-1 text-sm ${live ? 'text-white/80' : 'text-zinc-500 dark:text-zinc-400'}`}>
              იმალება{' '}
              <UserLink
                alias={game.hostAlias}
                level={game.hostLevel}
                className={`font-semibold ${live ? 'text-white' : 'text-zinc-900 dark:text-zinc-100'}`}
              />
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            {live ? (
              <>
                <div className="font-mono tabular-nums text-2xl font-bold text-white">{label}</div>
                <div className="text-xs text-white/70">დარჩა</div>
              </>
            ) : (
              <div className="rounded-full bg-zinc-100 dark:bg-zinc-900 px-2.5 py-1 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                დასრულდა
              </div>
            )}
          </div>
        </div>

        <div className={`mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs ${live ? 'text-white/80' : 'text-zinc-500 dark:text-zinc-400'}`}>
          <span className="inline-flex items-center gap-1">
            <UsersIcon className="w-3.5 h-3.5" />
            {players.length} მოთამაშე
          </span>
          <span>{foundCount} იპოვა</span>
          <span>{game.maxChecks} მცდელობა</span>
          <span>{formatMinutes(game.durationMinutes)}</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {live && !isHost && !viewer && currentUserId != null && (
          <button
            type="button"
            onClick={join}
            disabled={busy}
            className="w-full rounded-md bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {busy ? 'ერთვები...' : 'ძებნის დაწყება'}
          </button>
        )}

        {live && viewer?.role === 'seeker' && viewer.status === 'active' && (
          <NewCheck
            postId={game.postId}
            checksRemaining={viewer.checksRemaining}
            onSubmitted={handleChecked}
          />
        )}

        {viewer?.status === 'found' && (
          <div className="rounded-md bg-teal-50 dark:bg-teal-950/40 px-3 py-2.5 text-center text-sm font-semibold text-teal-700 dark:text-teal-300">
            იპოვე {game.hostAlias}!
          </div>
        )}

        {live && viewer?.status === 'out_of_checks' && (
          <div className="rounded-md bg-zinc-100 dark:bg-zinc-900 px-3 py-2.5 text-center text-sm text-zinc-600 dark:text-zinc-400">
            მცდელობები ამოგეწურა.
          </div>
        )}

        {live && isHost && (
          <button
            type="button"
            onClick={endGame}
            disabled={busy}
            className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
          >
            {busy ? 'სრულდება...' : 'თამაშის დასრულება'}
          </button>
        )}

        {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

        {players.length > 0 && (
          <div>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">მეძებრები</h3>
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {players.map((p) => (
                <PlayerRow key={p.id} player={p} isSelf={p.userId === currentUserId} />
              ))}
            </ul>
          </div>
        )}

        {game.coordinates && (
          <p className="font-mono text-xs text-zinc-400">
            {game.coordinates.latitude.toFixed(5)}, {game.coordinates.longitude.toFixed(5)}
          </p>
        )}
      </div>
    </section>
  );
}
