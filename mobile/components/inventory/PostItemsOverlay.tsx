import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { itemQualityColor, POST_ITEMS_VISIBLE_ICONS } from '@/types/item';
import type { PostItemType } from '@/types/item';
import { ItemIcon } from './ItemIcon';
import { LootWindowModal } from './LootWindowModal';

const SLOT_BG = 'rgba(7, 11, 28, 0.9)';
const SLOT_SIZE = 32;
/** How far each chip tucks under its neighbour. */
const OVERLAP = 8;

/**
 * The items a post found, stacked over the bottom-left corner of its photo — the date
 * stamp's counterpart on the right — the way Facebook stacks the faces of people who
 * reacted. Tapping the stack opens the loot window with every item's details at once.
 * Mirrors web src/components/inventory/post-items-overlay.tsx.
 *
 * Render it inside the photo's frame: it positions itself against that.
 */
export function PostItemsOverlay({ items }: { items: PostItemType[] }) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;

  const visible = items.slice(0, POST_ITEMS_VISIBLE_ICONS);
  const hidden = items.length - visible.length;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={8}
        accessibilityLabel={`ნაპოვნი ნივთები: ${items.length}`}
        className="absolute bottom-3 left-3 flex-row items-center"
        style={{
          shadowColor: '#000',
          shadowOpacity: 0.6,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 1 },
        }}
      >
        {visible.map((item, i) => (
          <View
            key={item.alias}
            className="items-center justify-center overflow-hidden rounded-md"
            style={{
              width: SLOT_SIZE,
              height: SLOT_SIZE,
              marginLeft: i === 0 ? 0 : -OVERLAP,
              backgroundColor: SLOT_BG,
              borderWidth: 2,
              borderColor: itemQualityColor(item.quality),
            }}
          >
            <ItemIcon iconUrl={item.iconUrl} size={24} />
          </View>
        ))}
        {hidden > 0 ? (
          <View
            className="items-center justify-center rounded-md px-1"
            style={{
              minWidth: SLOT_SIZE,
              height: SLOT_SIZE,
              marginLeft: -OVERLAP,
              backgroundColor: SLOT_BG,
              borderWidth: 2,
              borderColor: '#4b5065',
            }}
          >
            <Text className="text-xs font-semibold text-white">+{hidden}</Text>
          </View>
        ) : null}
      </Pressable>

      {open ? <LootWindowModal items={items} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
