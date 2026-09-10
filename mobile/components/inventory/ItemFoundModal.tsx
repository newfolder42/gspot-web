import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { itemQualityColor } from '@/types/item';
import type { FoundItemType } from '@/types/item';
import { useTheme } from '@/constants/colors';
import { BackpackIcon } from './BackpackIcon';
import { ItemDetails } from './ItemDetails';

/**
 * Shown right after a post lands on an item location. The grant already happened
 * server-side during submit — this is only the announcement, so the poster does not have
 * to wait for the push to learn what they found.
 */
export function ItemFoundModal({
  items,
  onClose,
}: {
  items: FoundItemType[];
  onClose: () => void;
}) {
  const theme = useTheme();
  if (items.length === 0) return null;

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(24,24,27,0.7)' }}
        className="items-center justify-center px-6"
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden"
        >
          <View className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex-row items-center gap-2">
            <BackpackIcon size={16} color={theme.icon} />
            <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {items.length > 1 ? 'ნივთები იპოვე' : 'ნივთი იპოვე'}
            </Text>
          </View>

          <ScrollView style={{ maxHeight: 400 }} contentContainerStyle={{ padding: 16, gap: 12 }}>
            {items.map((item) => (
              <View
                key={item.alias}
                className="rounded-xl bg-zinc-50 dark:bg-zinc-950 p-3"
                style={{ borderWidth: 2, borderColor: itemQualityColor(item.quality) }}
              >
                <ItemDetails item={item} />
              </View>
            ))}
          </ScrollView>

          <Pressable onPress={onClose} className="m-4 py-3 rounded-xl bg-brand items-center">
            <Text className="text-sm font-semibold text-white">გაგრძელება</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
