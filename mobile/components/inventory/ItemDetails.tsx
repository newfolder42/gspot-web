import { Text, View } from 'react-native';
import { formatPhotoTakenDate } from '@/lib/dates';
import { itemQualityColor, itemQualityLabel, showsItemCount } from '@/types/item';
import type { FoundItemType, InventoryItemType, ItemDefinition, ItemSource } from '@/types/item';
import { ItemIcon } from './ItemIcon';

/** Mirrors web src/components/inventory/item-details.tsx. */

/** WoW tooltips are dark in every theme, so these are fixed colours. */
const TOOLTIP_BG = 'rgba(7, 11, 28, 0.96)';
const TOOLTIP_BORDER = '#4b5065';
const FLAVOR_COLOR = '#ffd100';
const MUTED_COLOR = '#9d9d9d';

type AnyItem = ItemDefinition | InventoryItemType | FoundItemType;

function isOwned(item: AnyItem): item is InventoryItemType {
  return 'acquiredAt' in item;
}

/** Stackable items skip it — the date is only the first find, not the whole stack. */
function acquiredLine(item: AnyItem): string | null {
  if (!isOwned(item) || showsItemCount(item)) return null;
  return formatPhotoTakenDate(item.acquiredAt);
}

export function ItemDetails({ item }: { item: AnyItem }) {
  const color = itemQualityColor(item.quality);
  const acquired = acquiredLine(item);
  // Catalog rows may have no flavour text, or only whitespace — skip the line either way.
  const description = item.description?.trim();

  return (
    <View className="flex-row items-start gap-1.5">
      <View
        className="w-14 h-14 rounded-md items-center justify-center overflow-hidden"
        style={{ backgroundColor: TOOLTIP_BG, borderWidth: 2, borderColor: color }}
      >
        <ItemIcon iconUrl={item.iconUrl} size={42} />
        {showsItemCount(item) && 'count' in item && (
          <Text
            className="absolute bottom-0.5 right-1 text-[11px] font-semibold text-white"
            style={{ textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}
          >
            {item.count}
          </Text>
        )}
      </View>

      <View
        className="flex-1 min-w-0 min-h-14 rounded px-2.5 py-2"
        style={{ backgroundColor: TOOLTIP_BG, borderWidth: 1, borderColor: TOOLTIP_BORDER }}
      >
        <Text className="text-[15px] font-semibold" style={{ color }}>
          {item.name}
        </Text>
        <Text className="text-xs mt-0.5" style={{ color }}>
          {itemQualityLabel(item.quality)}
        </Text>

        {!!description && (
          <Text className="text-xs mt-1.5" style={{ color: FLAVOR_COLOR }}>
            “{description}”
          </Text>
        )}

        {!!acquired && (
          <Text className="text-[11px] mt-1.5" style={{ color: MUTED_COLOR }}>
            {acquired}
          </Text>
        )}
      </View>
    </View>
  );
}
