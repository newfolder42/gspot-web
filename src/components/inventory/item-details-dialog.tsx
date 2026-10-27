'use client';

import { createPortal } from 'react-dom';
import { XIcon } from '@/components/icons';
import type { InventoryItemType, ItemDefinition } from '@/types/item';
import ItemDetails from './item-details';

/**
 * The details card as a small dialog — the way in on touch, where there is no hover.
 * Portaled to the body so a transformed or clipped parent (a modal, a scroller) never
 * traps the fixed overlay.
 */
export default function ItemDetailsDialog({
  item,
  onClose,
}: {
  item: ItemDefinition | InventoryItemType;
  onClose: () => void;
}) {
  return createPortal(
    <div
      className="fixed inset-0 z-layer-modal flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div className="relative w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          aria-label="დახურვა"
          className="absolute -top-8 right-0 p-1 rounded text-zinc-300 hover:text-white"
        >
          <XIcon className="w-5 h-5" />
        </button>
        <ItemDetails item={item} />
      </div>
    </div>,
    document.body,
  );
}
