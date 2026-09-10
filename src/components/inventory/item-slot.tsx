'use client';

import { useState } from 'react';
import { itemQualityColor, showsItemCount } from '@/types/item';
import type { InventoryItemType } from '@/types/item';
import ItemIcon from './item-icon';
import ItemDetails from './item-details';

/** An empty bag slot — drawn even where there is nothing, so the bag keeps its shape. */
export function EmptySlot() {
  return (
    <div
      className="aspect-square rounded border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-100/60 dark:bg-zinc-900/60"
      aria-hidden
    />
  );
}

/**
 * A filled slot. Hover shows the details card on pointer devices; a click opens the same
 * card as a small dialog, which is the only way in on touch.
 */
export default function ItemSlot({
  item,
  onOpen,
}: {
  item: InventoryItemType;
  onOpen: (item: InventoryItemType) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const color = itemQualityColor(item.quality);

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        onClick={() => onOpen(item)}
        title={item.name}
        aria-label={showsItemCount(item) ? `${item.name} (${item.count})` : item.name}
        className="cursor-pointer relative w-full aspect-square rounded bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center overflow-hidden transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-transparent"
        style={{ border: `2px solid ${color}`, boxShadow: `inset 0 0 12px -6px ${color}` }}
      >
        <ItemIcon iconUrl={item.iconUrl} name={item.name} className="w-3/4 h-3/4" />
        {/* Stack size, bottom-right like a WoW bag slot. Unique items never show a number. */}
        {showsItemCount(item) && (
          <span className="absolute bottom-0.5 right-1 text-[11px] font-semibold leading-none text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.9)]">
            {item.count}
          </span>
        )}
      </button>

      {hovered && (
        <div className="pointer-events-none absolute z-20 left-1/2 top-full mt-2 w-64 -translate-x-1/2 hidden sm:block">
          <div className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 p-3 shadow-lg">
            <ItemDetails item={item} />
          </div>
        </div>
      )}
    </div>
  );
}
