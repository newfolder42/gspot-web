import { Text, View } from 'react-native';
import { formatPhotoTakenDate } from '@/lib/dates';
import { itemQualityColor, itemQualityLabel, showsItemCount } from '@/types/item';
import type { FoundItemType, InventoryItemType, ItemDefinition, ItemSource } from '@/types/item';
import { ItemIcon } from './ItemIcon';

/** Mirrors web src/components/inventory/item-details.tsx. */

const SOURCE_LABELS: Record<ItemSource, string> = {
  found: 'ნაპოვნია',
  quest: 'მისიიდან',
  achievement: 'მიღწევიდან',
  manual: 'გადმოცემულია',
};

type AnyItem = ItemDefinition | InventoryItemType | FoundItemType;

function isOwned(item: AnyItem): item is InventoryItemType {
  return 'acquiredAt' in item;
}

/** A count worth printing: the item stacks and we know how many are held. */
function heldCount(item: AnyItem): number | null {
  if (!showsItemCount(item) || !('count' in item)) return null;
  return item.count;
}

export function ItemDetails({ item }: { item: AnyItem }) {
  const color = itemQualityColor(item.quality);
  const lines = [item.type?.name, item.category?.name].filter(Boolean) as string[];
  const count = heldCount(item);

  return (
    <View className="flex-row gap-3">
      <View
        className="w-14 h-14 rounded items-center justify-center bg-zinc-100 dark:bg-zinc-900"
        style={{ borderWidth: 2, borderColor: color }}
      >
        <ItemIcon iconUrl={item.iconUrl} size={38} />
      </View>

      <View className="flex-1 min-w-0">
        <Text className="text-sm font-semibold" style={{ color }}>
          {item.name}
        </Text>
        <Text className="text-xs mt-0.5" style={{ color }}>
          {itemQualityLabel(item.quality)}
        </Text>

        {count !== null && (
          <Text className="text-xs text-zinc-600 dark:text-zinc-300 mt-1">გაქვს: {count}</Text>
        )}

        {lines.length > 0 && (
          <Text className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{lines.join(' · ')}</Text>
        )}

        {!!item.description && (
          <Text className="text-xs italic text-amber-600 dark:text-amber-400 mt-2">
            {item.description}
          </Text>
        )}

        {isOwned(item) && (
          <Text className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-2">
            {SOURCE_LABELS[item.source] ?? SOURCE_LABELS.found} · {formatPhotoTakenDate(item.acquiredAt)}
          </Text>
        )}
      </View>
    </View>
  );
}
