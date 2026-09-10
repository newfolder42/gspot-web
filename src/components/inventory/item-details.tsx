import { formatPhotoTakenDate } from '@/lib/dates';
import { itemQualityColor, itemQualityLabel, showsItemCount } from '@/types/item';
import type { FoundItemType, InventoryItemType, ItemDefinition, ItemSource } from '@/types/item';
import ItemIcon from './item-icon';

const SOURCE_LABELS: Record<ItemSource, string> = {
  found: 'ნაპოვნია',
  quest: 'მისიიდან',
  achievement: 'მიღწევიდან',
  manual: 'გადმოცემულია',
};

function isOwned(item: ItemDefinition | InventoryItemType | FoundItemType): item is InventoryItemType {
  return 'acquiredAt' in item;
}

/** A count worth printing: the item stacks and we know how many are held. */
function heldCount(item: ItemDefinition | InventoryItemType | FoundItemType): number | null {
  if (!showsItemCount(item) || !('count' in item)) return null;
  return item.count;
}

/**
 * The wowhead-style card: the name in its quality colour, the dry stats, then the
 * flavour text. Shared by the hover tooltip and the tap-to-open modal, so it carries no
 * positioning of its own.
 */
export default function ItemDetails({
  item,
}: {
  item: ItemDefinition | InventoryItemType | FoundItemType;
}) {
  const color = itemQualityColor(item.quality);
  const lines = [item.type?.name, item.category?.name].filter(Boolean) as string[];
  const count = heldCount(item);

  return (
    <div className="flex gap-3">
      <div
        className="shrink-0 w-14 h-14 rounded flex items-center justify-center bg-zinc-100 dark:bg-zinc-900"
        style={{ border: `2px solid ${color}` }}
      >
        <ItemIcon iconUrl={item.iconUrl} name={item.name} className="w-10 h-10" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight break-words" style={{ color }}>
          {item.name}
        </p>
        <p className="mt-0.5 text-xs" style={{ color }}>
          {itemQualityLabel(item.quality)}
        </p>

        {count !== null && (
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">გაქვს: {count}</p>
        )}

        {lines.length > 0 && (
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{lines.join(' · ')}</p>
        )}

        {item.description && (
          <p className="mt-2 text-xs italic leading-snug text-amber-600 dark:text-amber-400 break-words">
            {item.description}
          </p>
        )}

        {isOwned(item) && (
          <p className="mt-2 text-[11px] text-zinc-400 dark:text-zinc-500">
            {SOURCE_LABELS[item.source] ?? SOURCE_LABELS.found} · {formatPhotoTakenDate(item.acquiredAt)}
          </p>
        )}
      </div>
    </div>
  );
}
