'use client';

import { useRouter } from 'next/navigation';
import { XIcon } from '@/components/icons';
import { useModalLifecycle } from './use-modal-lifecycle';

export default function QuestModal({ title, children }: { title?: string; children: React.ReactNode }) {
  const router = useRouter();
  const close = () => router.back();
  useModalLifecycle(close);

  return (
    <div className="fixed inset-0 z-layer-modal flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={close} aria-hidden="true" />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-zinc-50 shadow-xl dark:bg-zinc-950">
        <div className="flex flex-shrink-0 items-center justify-between gap-2 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <span className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {title}
          </span>
          <button
            type="button"
            onClick={close}
            aria-label="დახურვა"
            title="დახურვა"
            className="p-2 rounded-md bg-zinc-700/90 text-zinc-100 hover:bg-zinc-700 transition"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        {/* Content scrolls within the bounded card. */}
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}
