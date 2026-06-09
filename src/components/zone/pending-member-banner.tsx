"use client";

import { useState, useTransition } from 'react';
import { acceptZoneInviteAction, zoneMemberLeave } from '@/actions/zones';

type Props = {
  zoneId: number;
  userId: number;
};

export default function PendingMemberBanner({ zoneId, userId }: Props) {
  const [visible, setVisible] = useState(true);
  const [isPending, startTransition] = useTransition();

  if (!visible) return null;

  function handleAccept() {
    startTransition(async () => {
      await acceptZoneInviteAction(zoneId);
      setVisible(false);
      window.location.reload();
    });
  }

  function handleDecline() {
    startTransition(async () => {
      await zoneMemberLeave(zoneId, userId);
      setVisible(false);
      window.location.reload();
    });
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-4 py-3 mb-4 flex items-center justify-between gap-3 flex-wrap">
      <p className="text-sm text-amber-800 dark:text-amber-300">
        შენ გაქვს მოწვევა ამ საბზონაში. გსურს გაწევრიანება?
      </p>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleAccept}
          disabled={isPending}
          className="rounded-md bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 transition"
        >
          გაწევრიანება
        </button>
        <button
          onClick={handleDecline}
          disabled={isPending}
          className="rounded-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 text-xs font-medium px-3 py-1.5 transition"
        >
          ყარყოფა
        </button>
      </div>
    </div>
  );
}
