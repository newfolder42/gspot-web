'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { loadInventoryAction } from '@/actions/inventory';
import { INVENTORY_DEFAULT_PAGE_SIZE, itemQualityColor } from '@/types/item';
import type { InventoryItemType, InventoryPageType } from '@/types/item';
import { BackpackIcon, XIcon } from '@/components/icons';
import ItemSlot, { EmptySlot } from './item-slot';
import ItemDetails from './item-details';

type Props = {
  initial: InventoryPageType;
  /** Slots per page. Passed in so a future "bag size" setting only touches the caller. */
  pageSize?: number;
};

export default function InventoryBag({ initial, pageSize = INVENTORY_DEFAULT_PAGE_SIZE }: Props) {
  const [data, setData] = useState<InventoryPageType>(initial);
  const [page, setPage] = useState(initial.page);
  const [nameInput, setNameInput] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<InventoryItemType | null>(null);

  // Debounce typing so a search does not fire one action per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setNameFilter(nameInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [nameInput]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const next = await loadInventoryAction({ page, pageSize, name: nameFilter || null });
      setData(next);
      // getInventoryForUser clamps to the last non-empty page; follow it.
      if (next.page !== page) setPage(next.page);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, nameFilter]);

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      // The server already rendered page 1 with these defaults.
      if (page === initial.page && !nameFilter && pageSize === initial.pageSize) {
        return;
      }
    }
    void load();
  }, [load, page, nameFilter, pageSize, initial.page, initial.pageSize]);

  const emptySlots = Math.max(0, pageSize - data.items.length);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-200">
          <BackpackIcon className="w-5 h-5" />
          <span className="text-sm font-semibold">ინვენტარი</span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{data.totalOwned} ნივთი</span>
        </div>

        <div className="flex-1" />

        <input
          type="search"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          placeholder="ძებნა"
          aria-label="ნივთის ძებნა სახელით"
          className="h-9 w-36 sm:w-44 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 text-sm text-zinc-900 dark:text-zinc-100"
        />
      </div>

      <div
        className={`grid grid-cols-4 sm:grid-cols-8 gap-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2 transition-opacity ${loading ? 'opacity-60' : ''}`}
      >
        {data.items.map((item) => (
          <ItemSlot key={item.alias} item={item} onOpen={setSelected} />
        ))}
        {Array.from({ length: emptySlots }).map((_, index) => (
          <EmptySlot key={`empty-${index}`} />
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setPage((current) => Math.max(1, current - 1))}
          disabled={data.page <= 1 || loading}
          className="h-9 px-3 rounded-md text-sm border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 disabled:opacity-40 cursor-pointer"
        >
          წინა
        </button>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {data.page} / {data.totalPages}
        </span>
        <button
          type="button"
          onClick={() => setPage((current) => Math.min(data.totalPages, current + 1))}
          disabled={data.page >= data.totalPages || loading}
          className="h-9 px-3 rounded-md text-sm border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 disabled:opacity-40 cursor-pointer"
        >
          შემდეგი
        </button>
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-layer-modal flex items-center justify-center bg-black/60 p-4"
          onClick={() => setSelected(null)}
          role="presentation"
        >
          <div
            className="w-full max-w-sm rounded-md bg-white dark:bg-zinc-950 p-4 shadow-xl"
            style={{ border: `2px solid ${itemQualityColor(selected.quality)}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="დახურვა"
                className="p-1 rounded text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>
            <ItemDetails item={selected} />
          </div>
        </div>
      )}
    </div>
  );
}
