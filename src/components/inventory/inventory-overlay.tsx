'use client';

import { useCallback, useEffect, useState } from 'react';
import { loadInventoryAction } from '@/actions/inventory';
import { INVENTORY_DEFAULT_PAGE_SIZE } from '@/types/item';
import type { InventoryPageType } from '@/types/item';
import { BackpackIcon, XIcon } from '@/components/icons';
import InventoryBag from './inventory-bag';

/** Anything can ask for the bag by dispatching this; the profile button does. */
export const OPEN_INVENTORY_EVENT = 'gspot:open-inventory';

export function openInventory() {
  window.dispatchEvent(new Event(OPEN_INVENTORY_EVENT));
}

/** True while the caret is somewhere that swallows plain letters. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

/**
 * The bag as a modal, mounted once for signed-in users. Opens on "I" (or Georgian "ი")
 * anywhere outside a text field, and on the OPEN_INVENTORY_EVENT. The page itself lives
 * at /inventory — this is the shortcut that never leaves the current view.
 */
export default function InventoryOverlay() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<InventoryPageType | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await loadInventoryAction({ page: 1, pageSize: INVENTORY_DEFAULT_PAGE_SIZE }));
    } finally {
      setLoading(false);
    }
  }, []);

  // Dropping the data on close makes the next opening remount the bag, so its page,
  // sort and filters start clean and a find made in between is picked up.
  const close = useCallback(() => {
    setOpen(false);
    setData(null);
  }, []);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_INVENTORY_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_INVENTORY_EVENT, onOpen);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      if (e.key === 'i' || e.key === 'I' || e.key === 'ი') {
        e.preventDefault();
        setOpen((current) => {
          if (current) setData(null);
          return !current;
        });
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  // Load once per opening so a find made since the last look shows up.
  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-layer-modal flex items-start justify-center bg-black/60 p-2 sm:p-6 overflow-y-auto"
      onClick={close}
      role="presentation"
    >
      <div
        className="w-full max-w-3xl rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-800 px-3 py-2">
          <span className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            <BackpackIcon className="w-5 h-5" />
            ინვენტარი
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

        <div className="p-3">
          {data ? (
            <InventoryBag initial={data} pageSize={data.pageSize} />
          ) : (
            <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
              {loading ? 'იტვირთება…' : 'ინვენტარი ვერ ჩაიტვირთა'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
