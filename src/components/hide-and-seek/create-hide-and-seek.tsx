"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import LocationPicker from './location-picker';
import { createHideAndSeekAction, resolveInviteeAliasAction } from '@/actions/hideAndSeek';
import { mapDefaultCenter } from '@/lib/map';
import {
  DEFAULT_CHECKS,
  DEFAULT_DURATION_MINUTES,
  DEFAULT_END_ON_FIRST_FIND,
  DURATION_OPTIONS,
  MAX_CHECKS,
  MIN_CHECKS,
  formatMinutes,
} from '@/types/hide-and-seek';
import type { HideAndSeekErrorReason } from '@/lib/hideAndSeek';
import { LockIcon, UsersIcon, XIcon } from '@/components/icons';

type ZoneOption = { id: number; slug: string; name: string };

const ERROR_MESSAGES: Record<HideAndSeekErrorReason, string> = {
  not_authenticated: 'ჯერ გაიარე ავტორიზაცია.',
  no_access: 'ამ საბზონაში პოსტის დამატება არ შეგიძლია.',
  already_in_game: 'უკვე ერთ დამალობანაში ხარ, ჯერ ის დაასრულე.',
  game_not_found: 'დამალობანა ვერ მოიძებნა.',
  game_ended: 'დამალობანა დასრულებულია.',
  not_host: 'მხოლოდ ავტორს შეუძლია.',
  host_cannot_seek: 'ავტორი ვერ ჩაერთვება საკუთარ თამაშში.',
  not_playing: 'ჯერ ჩაერთე თამაშში.',
  already_found: 'უკვე იპოვე!',
  out_of_checks: 'მცდელობები ამოგეწურა.',
  invalid_input: 'შეავსე ყველა ველი სწორად.',
  outside_georgia: 'აირჩიე წერტილი საქართველოს ტერიტორიაზე.',
  failed: 'შეცდომა მოხდა. სცადე თავიდან.',
};

export default function CreateHideAndSeek({ zones }: { zones: ZoneOption[] }) {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [coords, setCoords] = useState({ latitude: mapDefaultCenter[1], longitude: mapDefaultCenter[0] });
  const [durationMinutes, setDurationMinutes] = useState(DEFAULT_DURATION_MINUTES);
  const [maxChecks, setMaxChecks] = useState(DEFAULT_CHECKS);
  const [endOnFirstFind, setEndOnFirstFind] = useState(DEFAULT_END_ON_FIRST_FIND);
  const [zoneId, setZoneId] = useState<number | null>(zones[0]?.id ?? null);
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [inviteInput, setInviteInput] = useState('');
  const [invitees, setInvitees] = useState<string[]>([]);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const zone = zones.find((z) => z.id === zoneId) ?? null;

  const addInvitee = async () => {
    const candidate = inviteInput.trim().toLowerCase();
    if (!candidate || resolving) return;

    if (invitees.includes(candidate)) {
      setInviteInput('');
      return;
    }

    setResolving(true);
    setInviteError(null);
    const resolved = await resolveInviteeAliasAction(candidate);
    setResolving(false);

    if (!resolved) {
      setInviteError(`'${candidate} ვერ მოიძებნა.`);
      return;
    }

    setInvitees((prev) => [...prev, resolved]);
    setInviteInput('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!title.trim()) {
      setError('სათაური აუცილებელია.');
      return;
    }
    if (!zone) {
      setError('აირჩიე საბზონა.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const result = await createHideAndSeekAction({
      title: title.trim(),
      coordinates: coords,
      durationMinutes,
      maxChecks,
      zoneId: zone.id,
      zoneSlug: zone.slug,
      visibility,
      endOnFirstFind,
      inviteeAliases: visibility === 'private' ? invitees : [],
    });

    if (!result.ok) {
      setError(ERROR_MESSAGES[result.reason] ?? ERROR_MESSAGES.failed);
      setSubmitting(false);
      return;
    }

    router.push(`/post/${result.data.postId}`);
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="hs-title" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          სათაური
        </label>
        <input
          id="hs-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          placeholder="მაგ. ჩემს საყვარელ ბარში, ხიდის ქვეშ"
          className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
        />
      </div>

      <div className="space-y-1.5">
        <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">სამალავი ადგილი</span>
        <LocationPicker value={coords} onChange={setCoords} />
        <p className="text-xs text-zinc-500">
          ლოკაცია თამაშის ბოლომდე დამალულია და ცვლილებას არ ექვემდებარება.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="hs-duration" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            ხანგრძლივობა
          </label>
          <select
            id="hs-duration"
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
            className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
          >
            {DURATION_OPTIONS.map((m) => (
              <option key={m} value={m}>{formatMinutes(m)}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="hs-checks" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            მოთამაში მცდელობების რაოდენობა
          </label>
          <input
            id="hs-checks"
            type="number"
            min={MIN_CHECKS}
            max={MAX_CHECKS}
            value={maxChecks}
            onChange={(e) => setMaxChecks(Number(e.target.value))}
            className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
          />
          <p className="text-xs text-zinc-500">{MIN_CHECKS}-დან {MAX_CHECKS}-მდე.</p>
        </div>
      </div>

      <label
        htmlFor="hs-first-find"
        className="flex items-start gap-3 rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2.5 cursor-pointer"
      >
        <input
          id="hs-first-find"
          type="checkbox"
          checked={endOnFirstFind}
          onChange={(e) => setEndOnFirstFind(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-teal-600"
        />
        <span className="text-sm text-zinc-700 dark:text-zinc-300">
          პირველივე პოვნაზე თამაში ყველასთვის დასრულდეს
        </span>
      </label>

      <div className="space-y-1.5">
        <label htmlFor="hs-zone" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          საბზონა
        </label>
        <select
          id="hs-zone"
          value={zoneId ?? ''}
          onChange={(e) => setZoneId(Number(e.target.value))}
          className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
        >
          {zones.map((z) => (
            <option key={z.id} value={z.id}>{z.name}</option>
          ))}
        </select>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">ვის შეუძლია თამაში</legend>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setVisibility('public')}
            aria-pressed={visibility === 'public'}
            className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
              visibility === 'public'
                ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300'
                : 'border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            <UsersIcon className="w-4 h-4" />
            ყველას
          </button>
          <button
            type="button"
            onClick={() => setVisibility('private')}
            aria-pressed={visibility === 'private'}
            className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
              visibility === 'private'
                ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300'
                : 'border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            <LockIcon className="w-4 h-4" />
            მოწვეულებს
          </button>
        </div>
        {visibility === 'private' && (
          <div className="space-y-1.5 pt-1">
            <label htmlFor="hs-invites" className="block text-sm text-zinc-600 dark:text-zinc-400">
              მოსაწვევები
            </label>
            <div className="flex gap-2">
              <input
                id="hs-invites"
                type="text"
                value={inviteInput}
                onChange={(e) => { setInviteInput(e.target.value); setInviteError(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addInvitee(); } }}
                placeholder="თიკუნი"
                className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
              />
              <button
                type="button"
                onClick={addInvitee}
                disabled={resolving || !inviteInput.trim()}
                className="rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
              >
                {resolving ? '...' : 'დამატება'}
              </button>
            </div>

            {invitees.length > 0 && (
              <ul className="flex flex-wrap gap-1.5 pt-1">
                {invitees.map((a) => (
                  <li key={a}>
                    <button
                      type="button"
                      onClick={() => setInvitees((prev) => prev.filter((x) => x !== a))}
                      className="inline-flex items-center gap-1 rounded-full bg-teal-50 dark:bg-teal-950/40 px-2.5 py-1 text-xs font-medium text-teal-700 dark:text-teal-300"
                      aria-label={`'${a}-ის წაშლა`}
                    >
                      &apos;{a}
                      <XIcon className="w-3 h-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {inviteError && <p className="text-xs text-rose-600 dark:text-rose-400">{inviteError}</p>}
            <p className="text-xs text-zinc-500">
              {invitees.length === 0
                ? 'თუ არავის მოიწვევ, თამაშს მხოლოდ შენ დაინახავ.'
                : 'მხოლოდ მოწვეულები ნახავენ ამ თამაშს.'}
            </p>
          </div>
        )}
      </fieldset>

      {error && (
        <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
      >
        {submitting ? 'იქმნება...' : 'დაწყება'}
      </button>
    </form>
  );
}
