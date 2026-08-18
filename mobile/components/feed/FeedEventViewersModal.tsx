import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LevelBadge } from '@/components/ui/LevelBadge';
import { feedEventsApi } from '@/lib/feedEvents';
import { formatTimePassed } from '@/lib/dates';

/** Mirrors web FeedEventViewersModal — a bottom sheet of who saw your event. */
export function FeedEventViewersModal({ eventId, onClose }: { eventId: number; onClose: () => void }) {
  const { data: viewers, isLoading } = useQuery({
    queryKey: ['feed-event-viewers', eventId],
    queryFn: () => feedEventsApi.getViewers(eventId),
  });

  const reactionCount = viewers?.filter((v) => v.reacted).length ?? 0;

  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="bg-white dark:bg-zinc-900 rounded-t-3xl"
          style={{ maxHeight: '70%' }}
        >
          <View className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <Text className="font-semibold text-sm text-zinc-800 dark:text-zinc-100">
                ვინ ნახა{viewers ? ` (${viewers.length})` : ''}
              </Text>
              {reactionCount > 0 ? (
                <View className="flex-row items-center gap-1">
                  <MaterialCommunityIcons name="arrow-up-bold" size={16} color="#14B8A6" />
                  <Text className="text-sm font-semibold text-teal-600 dark:text-teal-400">
                    {reactionCount}
                  </Text>
                </View>
              ) : null}
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={18} color="#A1A1AA" />
            </Pressable>
          </View>

          {isLoading ? (
            <View className="p-6 items-center">
              <ActivityIndicator color="#14B8A6" />
            </View>
          ) : !viewers || viewers.length === 0 ? (
            <Text className="p-6 text-center text-zinc-400 text-sm">ჯერ არავის უნახავს</Text>
          ) : (
            <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
              {viewers.map((v, i) => (
                <View
                  key={`${v.alias}-${i}`}
                  className="px-4 py-3 flex-row items-center justify-between border-b border-zinc-100 dark:border-zinc-800"
                >
                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                      &apos;{v.alias}
                    </Text>
                    {v.level != null ? <LevelBadge level={v.level} /> : null}
                    {v.reacted ? (
                      <MaterialCommunityIcons name="arrow-up-bold" size={16} color="#14B8A6" />
                    ) : null}
                  </View>
                  <Text className="text-xs text-zinc-400">{formatTimePassed(v.seenAt)}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
