"use client";

import { useState, useTransition } from 'react';
import { inviteZoneMemberAction } from '@/actions/zones';

type Props = {
  zoneId: number;
};

export default function InviteZoneMember({ zoneId }: Props) {
  const [open, setOpen] = useState(false);
  const [alias, setAlias] = useState('');
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleOpen() {
    setOpen(true);
    setAlias('');
    setResult(null);
  }

  function handleClose() {
    setOpen(false);
    setAlias('');
    setResult(null);
  }

  function handleInvite() {
    if (!alias.trim()) return;
    setResult(null);
    startTransition(async () => {
      const res = await inviteZoneMemberAction(zoneId, alias.trim());
      if (res.success) {
        setResult({ type: 'success', message: `'${alias.trim()} მოწვეულია.` });
        setAlias('');
      } else {
        setResult({ type: 'error', message: res.error ?? 'შეცდომა' });
      }
    });
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="19" y1="8" x2="19" y2="14" />
          <line x1="22" y1="11" x2="16" y2="11" />
        </svg>
        მოწვევა
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 shadow-xl">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 mb-4">წევრის მოწვევა</h2>

            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={alias}
                onChange={e => setAlias(e.target.value)}
                placeholder="თიკუნი"
                className="flex-1 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                onKeyDown={e => { if (e.key === 'Enter') handleInvite(); }}
                autoFocus
              />
              <button
                onClick={handleInvite}
                disabled={isPending || !alias.trim()}
                className="rounded-md bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 transition"
              >
                {isPending ? '...' : 'მოწვევა'}
              </button>
            </div>

            {result && (
              <p className={`text-sm mb-3 ${result.type === 'success' ? 'text-teal-600 dark:text-teal-400' : 'text-red-500'}`}>
                {result.message}
              </p>
            )}

            <button
              onClick={handleClose}
              className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition"
            >
              დახურვა
            </button>
          </div>
        </div>
      )}
    </>
  );
}
