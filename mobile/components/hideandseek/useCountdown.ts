import { useEffect, useState } from 'react';
import { formatRemaining, hasExpired } from '@/types/hide-and-seek';

/**
 * Ticks down to `endsAt`, firing `onExpire` once. Lets the UI drop to its ended state
 * without waiting for the server's minute-by-minute expiry job.
 */
export function useCountdown(endsAt: string | undefined, onExpire?: () => void) {
  const [label, setLabel] = useState(() => (endsAt ? formatRemaining(endsAt) : '0:00'));
  const [expired, setExpired] = useState(() => (endsAt ? hasExpired(endsAt) : true));

  useEffect(() => {
    if (!endsAt) return;

    setLabel(formatRemaining(endsAt));
    setExpired(hasExpired(endsAt));

    const id = setInterval(() => {
      setLabel(formatRemaining(endsAt));
      if (hasExpired(endsAt)) {
        setExpired(true);
        clearInterval(id);
        onExpire?.();
      }
    }, 1000);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endsAt]);

  return { label, expired };
}
