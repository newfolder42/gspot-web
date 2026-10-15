"use client";

import BecomeZoneMemberButton from './become-zone-member-button';
import type { ZoneJoinPolicy, ZoneMemberStatus } from '@/actions/zones';

type Props = {
  zoneId: number;
  userId: number;
  /** The viewer's membership of the zone, null when they never joined. */
  status: ZoneMemberStatus | null;
  joinPolicy: ZoneJoinPolicy;
};

function messageFor(status: ZoneMemberStatus | null, joinPolicy: ZoneJoinPolicy): string {
  if (status === 'banned') return 'ამ საბზონაში მონაწილეობა შეზღუდულია.';
  if (status === 'pending') return 'გაწევრიანება ჯერ არ დადასტურებულა.';
  if (joinPolicy === 'invite_only') return 'ამ საბზონაში მონაწილეობა მხოლოდ მოწვევით შეიძლება.';
  return 'ამ საბზონაში მონაწილეობისთვის (გამოცნობა, კომენტარი, ხმა) ჯერ გაწევრიანდი.';
}

/**
 * Shown where the controls would be when the viewer can read a zone's post but is not an
 * active member of it. Joining reloads the page, so the server re-decides what they may do.
 */
export default function ZoneJoinPrompt({ zoneId, userId, status, joinPolicy }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2.5">
      <p className="text-sm text-zinc-700 dark:text-zinc-300">{messageFor(status, joinPolicy)}</p>
      <BecomeZoneMemberButton
        zoneId={zoneId}
        userId={userId}
        joinPolicy={joinPolicy}
        initialStatus={status}
        onStatusChange={(next) => {
          if (next === 'active') window.location.reload();
        }}
      />
    </div>
  );
}
