'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

// Parallel route slots keep rendering their last matched page when a soft
// navigation moves to a route they don't intercept, so a modal would
// otherwise stay on screen over an already-changed background page.
// usePathname() still updates for it (it's just React context), so comparing
// against the pathname captured at mount lets the modal detect that it's
// stale and unmount itself instead of needing a full page reload.
export function useModalLifecycle(onClose: () => void): boolean {
  const pathname = usePathname();
  const openedPathnameRef = useRef(pathname);
  const isStale = pathname !== openedPathnameRef.current;

  useEffect(() => {
    if (isStale) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    const scrollY = window.scrollY;
    const body = document.body;
    const prev = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
    };
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      body.style.overflow = prev.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [onClose, isStale]);

  return isStale;
}
