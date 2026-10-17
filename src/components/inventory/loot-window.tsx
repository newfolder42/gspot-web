'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { XIcon } from '@/components/icons';
import type { PostItemType } from '@/types/item';
import ItemDetails from './item-details';

/**
 * Chrome of a WoW loot frame: a dark panel with an aged-gold border and a gold title. Fixed
 * colours in every theme, like the item cards inside it.
 */
const FRAME_BG = 'linear-gradient(180deg, rgba(20, 24, 44, 0.98) 0%, rgba(7, 11, 28, 0.98) 100%)';
const FRAME_BORDER = '#7a6a3a';
const FRAME_RULE = '#2b2412';
const TITLE_COLOR = '#ffd100';

/**
 * Every item a post found, laid out like the Warcraft loot window — one framed panel, one
 * full details card per item, all open at once. Opened from the overlay on the post's photo.
 *
 * Portaled to the body: the overlay sits inside a feed card, and a transformed or clipped
 * ancestor would otherwise trap a `fixed` dialog inside it.
 */
export default function LootWindow({
  items,
  onClose,
}: {
  items: PostItemType[];
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="ნადავლი"
      className="fixed inset-0 z-layer-modal flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-md"
        style={{
          background: FRAME_BG,
          border: `2px solid ${FRAME_BORDER}`,
          boxShadow: `inset 0 0 0 1px ${FRAME_RULE}, 0 12px 40px rgba(0, 0, 0, 0.6)`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-3 py-2"
          style={{ borderBottom: `1px solid ${FRAME_RULE}` }}
        >
          <h2 className="text-sm font-semibold tracking-wide" style={{ color: TITLE_COLOR }}>
            ნადავლი
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="დახურვა"
            className="cursor-pointer p-1 rounded text-zinc-400 hover:text-white"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        <ul className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto p-2">
          {items.map((item) => (
            <li key={item.alias}>
              <ItemDetails item={item} />
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
