'use client';

import { useState } from 'react';
import { itemQualityColor, POST_ITEMS_VISIBLE_ICONS } from '@/types/item';
import type { PostItemType } from '@/types/item';
import ItemIcon from './item-icon';
import LootWindow from './loot-window';

const SLOT_BG = 'rgba(7, 11, 28, 0.9)';

/**
 * The items a post found, stacked over the bottom-left corner of its photo — the date
 * stamp's counterpart on the right — the way Facebook stacks the faces of people who
 * reacted. Tapping the stack opens the loot window with every item's details at once.
 *
 * It is a sibling of the photo's link, not a child, so tapping it never opens the post.
 */
export default function PostItemsOverlay({ items }: { items: PostItemType[] }) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;

  const visible = items.slice(0, POST_ITEMS_VISIBLE_ICONS);
  const hidden = items.length - visible.length;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`ნაპოვნი ნივთები: ${items.length}`}
        title="ნაპოვნი ნივთები"
        className="absolute bottom-3 left-3 flex cursor-pointer items-center pl-2 drop-shadow-[0_1px_6px_rgba(0,0,0,0.7)]"
      >
        {visible.map((item) => (
          <span
            key={item.alias}
            className="-ml-2 flex h-8 w-8 items-center justify-center overflow-hidden rounded-md"
            style={{ background: SLOT_BG, border: `2px solid ${itemQualityColor(item.quality)}` }}
          >
            <ItemIcon iconUrl={item.iconUrl} name={item.name} className="w-6 h-6" />
          </span>
        ))}
        {hidden > 0 && (
          <span
            className="-ml-2 flex h-8 min-w-8 items-center justify-center rounded-md px-1 text-xs font-semibold text-white"
            style={{ background: SLOT_BG, border: '2px solid #4b5065' }}
          >
            +{hidden}
          </span>
        )}
      </button>

      {open && <LootWindow items={items} onClose={() => setOpen(false)} />}
    </>
  );
}
