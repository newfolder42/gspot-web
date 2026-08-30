"use client";

import { useEffect, useState } from 'react';

function remainingMs(endsAt: string): number {
  return Math.max(0, new Date(endsAt).getTime() - Date.now());
}

function format(ms: number): string {
  const total = Math.floor(ms / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

/** Ticks down to ends_at and calls back once, so the UI can drop to its ended state
 *  without waiting for the server's expiry job to run. */
export function useCountdown(endsAt: string, onExpire?: () => void) {
  const [ms, setMs] = useState(() => remainingMs(endsAt));

  useEffect(() => {
    setMs(remainingMs(endsAt));

    const id = setInterval(() => {
      const next = remainingMs(endsAt);
      setMs(next);
      if (next === 0) {
        clearInterval(id);
        onExpire?.();
      }
    }, 1000);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endsAt]);

  return { ms, expired: ms === 0, label: format(ms) };
}

export default function Countdown({ endsAt, className }: { endsAt: string; className?: string }) {
  const { label, expired } = useCountdown(endsAt);

  return (
    <span className={`font-mono tabular-nums ${className ?? ''}`}>
      {expired ? 'დასრულდა' : label}
    </span>
  );
}
