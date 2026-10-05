import { formatPhotoTakenDate } from '@/lib/dates';
import { itemQualityColor, itemQualityLabel, showsItemCount } from '@/types/item';
import type { FoundItemType, InventoryItemType, ItemDefinition, ItemSource } from '@/types/item';
import ItemIcon from './item-icon';

/**
 * WoW tooltips are dark in every theme, so these are fixed colours rather than
 * light/dark Tailwind pairs. Flavour text uses WoW's tooltip gold.
 */
const TOOLTIP_BG = 'rgba(7, 11, 28, 0.96)';
const TOOLTIP_BORDER = '#4b5065';
const FLAVOR_COLOR = '#ffd100';
const MUTED_COLOR = '#9d9d9d';

type AnyItem = ItemDefinition | InventoryItemType | FoundItemType;

function isOwned(item: AnyItem): item is InventoryItemType {
  return 'acquiredAt' in item;
}

/**
 * The acquisition line. Stackable items skip it entirely — the date is only the first
 * find, which says nothing about the rest of the stack.
 */
function acquiredLine(item: AnyItem): string | null {
  if (!isOwned(item) || showsItemCount(item)) return null;
  return formatPhotoTakenDate(item.acquiredAt);
}

/**
 * The wowhead-style card: icon to the left of a dark box, the name in its quality
 * colour, then gold flavour text. Shared by the hover tooltip (box only) and the
 * tap-to-open dialogs, so it carries no positioning of its own.
 */
export default function ItemDetails({
  item,
  hideIcon = false,
}: {
  item: AnyItem;
  /** For the bag hover, where the slot beside it already shows the icon and count. */
  hideIcon?: boolean;
}) {
  const color = itemQualityColor(item.quality);
  const acquired = acquiredLine(item);
  // Catalog rows may have no flavour text, or only whitespace — skip the line either way.
  const description = item.description?.trim();

  return (
    <div className="flex items-start gap-1.5">
      {!hideIcon && (
        <div
          className="relative shrink-0 w-14 h-14 rounded-md flex items-center justify-center overflow-hidden"
          style={{ background: TOOLTIP_BG, border: `2px solid ${color}` }}
        >
          <ItemIcon iconUrl={item.iconUrl} name={item.name} className="w-11 h-11" />
          {showsItemCount(item) && 'count' in item && (
            <span className="absolute bottom-0.5 right-1 text-[11px] font-semibold leading-none text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.9)]">
              {item.count}
            </span>
          )}
        </div>
      )}

      <div
        className={`min-w-0 flex-1 rounded px-2.5 py-2 shadow-[0_4px_16px_rgba(0,0,0,0.5)] ${hideIcon ? '' : 'min-h-14'}`}
        style={{ background: TOOLTIP_BG, border: `1px solid ${TOOLTIP_BORDER}` }}
      >
        <p className="text-[15px] font-semibold leading-tight break-words" style={{ color }}>
          {item.name}
        </p>
        <p className="mt-0.5 text-xs" style={{ color }}>
          {itemQualityLabel(item.quality)}
        </p>

        {description && (
          <p className="mt-1.5 text-xs leading-snug break-words" style={{ color: FLAVOR_COLOR }}>
            &ldquo;{description}&rdquo;
          </p>
        )}

        {acquired && (
          <p className="mt-1.5 text-[11px]" style={{ color: MUTED_COLOR }}>
            {acquired}
          </p>
        )}
      </div>
    </div>
  );
}
