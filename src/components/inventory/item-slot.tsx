'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

/** Gap between the slot and the tooltip, and the margin kept from the viewport edge. */
const SLOT_GAP = 8;
const EDGE_MARGIN = 8;

/**
 * WoW bag-style hover tooltip: just the card, no second icon, pinned beside the slot —
 * to its right, top edges aligned, flipping to the left when it would leave the viewport.
 * Portaled to the body so the bag's overflow and stacking never clip it.
 */
function SlotTooltip({ item, anchor }: { item: InventoryItemType; anchor: DOMRect }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = anchor.right + SLOT_GAP;
    if (left + width > vw - EDGE_MARGIN) left = anchor.left - SLOT_GAP - width;

    setPos({
      left: Math.max(EDGE_MARGIN, left),
      top: Math.max(EDGE_MARGIN, Math.min(anchor.top, vh - height - EDGE_MARGIN)),
    });
  }, [anchor]);

  return createPortal(
    <div
      ref={ref}
      className="pointer-events-none fixed z-layer-critical w-max max-w-72 hidden sm:block"
      style={{ left: pos?.left ?? 0, top: pos?.top ?? 0, visibility: pos ? 'visible' : 'hidden' }}
    >
      <ItemDetails item={item} hideIcon />
    </div>,
    document.body,
  );
}

/**
 * A filled slot. Hover shows the details card beside the slot on pointer devices; a
 * click opens the same card as a small dialog, which is the only way in on touch.
 */
export default function ItemSlot({
  item,
  onOpen,
}: {
  item: InventoryItemType;
  onOpen: (item: InventoryItemType) => void;
}) {
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const color = itemQualityColor(item.quality);

  // The tooltip is fixed-positioned, so a scroll would leave it behind — drop it instead.
  useEffect(() => {
    if (!anchor) return;
    const hide = () => setAnchor(null);
    window.addEventListener('scroll', hide, { capture: true, passive: true });
    return () => window.removeEventListener('scroll', hide, { capture: true });
  }, [anchor]);

  return (
    <div
      className="relative"
      onMouseEnter={(e) => setAnchor(e.currentTarget.getBoundingClientRect())}
      onMouseLeave={() => setAnchor(null)}
    >
      <button
        type="button"
        onClick={() => onOpen(item)}
        aria-label={showsItemCount(item) ? `${item.name} (${item.count})` : item.name}
        className="cursor-pointer relative w-full aspect-square rounded bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center overflow-hidden focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-transparent"
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

      {anchor && <SlotTooltip item={item} anchor={anchor} />}
    </div>
  );
}
