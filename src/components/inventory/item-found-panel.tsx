'use client';

import { itemQualityColor } from '@/types/item';
import type { FoundItemType } from '@/types/item';
import { BackpackIcon } from '@/components/icons';
import ItemDetails from './item-details';

/**
 * Shown right after a post lands on an item location, before the poster is sent on to
 * their post. The grant already happened server-side — this is only the announcement.
 */
export default function ItemFoundPanel({
  items,
  onContinue,
}: {
  items: FoundItemType[];
  onContinue: () => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="fixed inset-0 z-layer-modal flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 shadow-xl">
        <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
          <BackpackIcon className="w-5 h-5" />
          <h2 className="text-sm font-semibold">
            {items.length > 1 ? 'ნივთები იპოვე' : 'ნივთი იპოვე'}
          </h2>
        </div>

        <div className="mt-3 flex flex-col gap-3">
          {items.map((item) => (
            <div
              key={item.alias}
              className="rounded-md bg-zinc-50 dark:bg-zinc-900 p-3"
              style={{ border: `2px solid ${itemQualityColor(item.quality)}` }}
            >
              <ItemDetails item={item} />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onContinue}
          className="mt-4 w-full h-10 rounded-md bg-zinc-900 dark:bg-zinc-100 text-sm font-medium text-white dark:text-zinc-900"
        >
          გაგრძელება
        </button>
      </div>
    </div>
  );
}
