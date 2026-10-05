import { Modal, Pressable, ScrollView, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { InventoryItemType, ItemDefinition } from '@/types/item';
import { ItemDetails } from './ItemDetails';

/** Tap a slot to see the wowhead-style card — the app's stand-in for a hover tooltip. */
export function ItemDetailsModal({
  item,
  onClose,
}: {
  item: ItemDefinition | InventoryItemType;
  onClose: () => void;
}) {
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(24,24,27,0.6)' }}
        className="items-center justify-center px-6"
        onPress={onClose}
      >
        <Pressable onPress={(e) => e.stopPropagation()} className="w-full max-w-sm">
          <View className="flex-row justify-end mb-2">
            <Pressable onPress={onClose} hitSlop={8} className="p-1.5">
              <Feather name="x" size={20} color="#d4d4d8" />
            </Pressable>
          </View>
          <ScrollView style={{ maxHeight: 400 }}>
            <ItemDetails item={item} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
