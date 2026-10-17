import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useDialogScrollHeight } from '@/lib/layout';
import type { PostItemType } from '@/types/item';
import { ItemDetails } from './ItemDetails';

/**
 * Chrome of a WoW loot frame: a dark panel with an aged-gold border and a gold title.
 * Fixed colours in every theme, like the item cards inside it. Mirrors web
 * src/components/inventory/loot-window.tsx.
 */
const FRAME_BG = 'rgba(10, 14, 32, 0.98)';
const FRAME_BORDER = '#7a6a3a';
const FRAME_RULE = '#2b2412';
const TITLE_COLOR = '#ffd100';

/**
 * Every item a post found, laid out like the Warcraft loot window — one framed panel, one
 * full details card per item, all open at once. Opened from the overlay on the post's photo.
 */
export function LootWindowModal({
  items,
  onClose,
}: {
  items: PostItemType[];
  onClose: () => void;
}) {
  // Header row plus the list's own padding.
  const maxHeight = useDialogScrollHeight(90, 420);

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' }}
        className="items-center justify-center px-6"
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-md overflow-hidden"
          style={{ backgroundColor: FRAME_BG, borderWidth: 2, borderColor: FRAME_BORDER }}
        >
          <View
            className="flex-row items-center justify-between px-3 py-2"
            style={{ borderBottomWidth: 1, borderBottomColor: FRAME_RULE }}
          >
            <Text className="text-sm font-semibold" style={{ color: TITLE_COLOR, letterSpacing: 0.5 }}>
              ნადავლი
            </Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="დახურვა">
              <Feather name="x" size={18} color="#a1a1aa" />
            </Pressable>
          </View>

          <ScrollView style={{ maxHeight }} contentContainerStyle={{ padding: 8, gap: 8 }}>
            {items.map((item) => (
              <ItemDetails key={item.alias} item={item} />
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
