import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/constants/colors';
import type { MobileZoneFeedFilter, ZoneTag } from '@/lib/zones';

export const FEED_STATUS_FILTERS: { value: MobileZoneFeedFilter; label: string }[] = [
  { value: 'all', label: 'ყველა' },
  { value: 'guessed', label: 'გამოცნობილი' },
  { value: 'not-guessed', label: 'გამოსაცნობი' },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  filter: MobileZoneFeedFilter;
  onFilterChange: (value: MobileZoneFeedFilter) => void;
  tags: ZoneTag[];
  activeTagId: number | null;
  onTagChange: (id: number | null) => void;
};

/** Feed filters, in a sheet that rises from the bottom edge. Backdrop tap or the X closes it. */
export function FeedOptionsSheet({
  visible,
  onClose,
  filter,
  onFilterChange,
  tags,
  activeTagId,
  onTagChange,
}: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={{ flex: 1, backgroundColor: theme.overlay }} className="justify-end" onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="rounded-t-2xl bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800"
          style={{ paddingBottom: insets.bottom + 16, maxHeight: '80%' }}
        >
          <View className="items-center pt-2">
            <View className="h-1 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700" />
          </View>

          <View className="px-4 py-3 flex-row items-center justify-between">
            <Text className="text-base font-semibold text-zinc-900 dark:text-zinc-50">ფიდის პარამეტრები</Text>
            <Pressable onPress={onClose} hitSlop={8} className="p-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800">
              <Feather name="x" size={16} color={theme.icon} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            <Text className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400 mb-2">სტატუსი</Text>
            <View className="flex-row flex-wrap gap-2">
              {FEED_STATUS_FILTERS.map((opt) => {
                const active = opt.value === filter;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => onFilterChange(opt.value)}
                    className={`px-3.5 py-2 rounded-full border ${
                      active
                        ? 'bg-teal-600 border-teal-600'
                        : 'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700'
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${active ? 'text-white' : 'text-zinc-700 dark:text-zinc-300'}`}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {tags.length > 0 ? (
              <>
                <Text className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400 mb-2 mt-6">
                  თეგი
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  <Pressable
                    onPress={() => onTagChange(null)}
                    className={`px-3.5 py-2 rounded-full border ${
                      activeTagId === null
                        ? 'bg-zinc-700 border-zinc-700'
                        : 'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700'
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        activeTagId === null ? 'text-white' : 'text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      ყველა
                    </Text>
                  </Pressable>
                  {tags.map((tag) => {
                    const active = activeTagId === tag.id;
                    return (
                      <Pressable key={tag.id} onPress={() => onTagChange(active ? null : tag.id)}>
                        <View
                          className="px-3.5 py-2 rounded-full"
                          style={{
                            backgroundColor: active ? tag.color : 'transparent',
                            borderWidth: 1.5,
                            borderColor: tag.color,
                          }}
                        >
                          <Text
                            className="text-sm font-semibold"
                            style={{ color: active ? '#fff' : tag.color }}
                          >
                            {tag.name}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
