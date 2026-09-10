import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { itemQualityColor } from '@/types/item';
import type { InventoryItemType, ItemDefinition } from '@/types/item';
import { useTheme } from '@/constants/colors';
import { ItemDetails } from './ItemDetails';

/** Tap a slot to see the wowhead-style card — the app's stand-in for a hover tooltip. */
export function ItemDetailsModal({
  item,
  onClose,
}: {
  item: ItemDefinition | InventoryItemType;
  onClose: () => void;
}) {
  const theme = useTheme();

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(24,24,27,0.6)' }}
        className="items-center justify-center px-6"
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden"
          style={{ borderWidth: 2, borderColor: itemQualityColor(item.quality) }}
        >
          <View className="px-4 py-3 flex-row items-center justify-end">
            <Pressable onPress={onClose} hitSlop={8} className="p-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800">
              <Feather name="x" size={15} color={theme.icon} />
            </Pressable>
          </View>
          <ScrollView style={{ maxHeight: 400 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>
            <ItemDetails item={item} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
