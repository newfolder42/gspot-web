'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { XIcon } from '@/components/icons';

export default function Modal({ title, children }: { title?: string; children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') router.back();
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
  }, [router]);

  return (
    <div className="fixed inset-0 z-layer-modal flex flex-col bg-zinc-50 dark:bg-zinc-950">
      <div className="flex flex-shrink-0 items-center justify-between gap-2 px-3 py-2">
        <span className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-100">
          {title}
        </span>
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="დახურვა"
          title="დახურვა"
          className="p-2 rounded-md bg-zinc-700/90 text-zinc-100 hover:bg-zinc-700 transition"
        >
          <XIcon className="w-5 h-5" />
        </button>
      </div>
      {/* Content scrolls within the fullscreen container. */}
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
