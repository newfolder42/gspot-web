'use client';

import { useRouter } from 'next/navigation';
import { XIcon } from '@/components/icons';
import { useModalLifecycle } from './use-modal-lifecycle';

export default function Modal({ title, children }: { title?: string; children: React.ReactNode }) {
  const router = useRouter();
  const isStale = useModalLifecycle(() => router.back());
  if (isStale) return null;

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
