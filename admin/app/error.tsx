'use client';

import { primaryButtonClass } from '@/components/ui';

// Most failures here are a missing or wrong .env.local (database, S3), so the message is
// printed as it is — this app only ever runs on the owner's machine.
export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="max-w-xl space-y-3">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">შეცდომა მოხდა. სცადე თავიდან.</h1>
      <p className="text-sm font-mono text-zinc-600 dark:text-zinc-400 break-words">{error.message}</p>
      <button type="button" onClick={reset} className={primaryButtonClass}>
        თავიდან ცდა
      </button>
    </div>
  );
}
