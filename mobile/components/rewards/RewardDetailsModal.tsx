import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LevelBadge } from '@/components/ui/LevelBadge';
import { RewardIcon } from '@/components/rewards/RewardIcon';
import { rewardsApi } from '@/lib/rewards';
import { formatTimePassed } from '@/lib/dates';

type Props = {
  postId: number;
  commentId: number | null;
  onClose: () => void;
};

/** Mirrors web RewardDetailsModal — givers grouped by reward, newest group first. */
export function RewardDetailsModal({ postId, commentId, onClose }: Props) {
  const router = useRouter();

  const { data: users, isLoading } = useQuery({
    queryKey: ['reward-users', postId, commentId],
    queryFn: () => rewardsApi.getUsers(postId, commentId),
  });

  // Preserves the natural order of `users` (most recently given first), so no
  // separate definitions fetch is needed just to decide group order.
  const keys = Array.from(new Set((users ?? []).map((u) => u.key)));

  const openProfile = (alias: string) => {
    onClose();
    router.push({ pathname: '/(app)/user/[alias]', params: { alias } });
  };

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(24,24,27,0.6)' }}
        className="items-center justify-center px-6"
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden"
        >
          <View className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">ჯილდოს გამცემები</Text>
            <Pressable onPress={onClose} hitSlop={8} className="p-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800">
              <Feather name="x" size={15} color="#71717A" />
            </Pressable>
          </View>

          <ScrollView style={{ maxHeight: 400 }} contentContainerStyle={{ padding: 16 }}>
            {isLoading ? (
              <View className="py-6 items-center">
                <ActivityIndicator color="#14B8A6" />
              </View>
            ) : !users || users.length === 0 ? (
              <Text className="py-6 text-center text-sm text-zinc-600 dark:text-zinc-300">ჯილდოები არ არის</Text>
            ) : (
              keys.map((key) => {
                const group = users.filter((u) => u.key === key);
                const { name, iconUrl } = group[0];
                return (
                  <View key={key} className="mb-4">
                    <View className="flex-row items-center gap-2 mb-2">
                      <RewardIcon iconUrl={iconUrl} size={20} />
                      <Text className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{name}</Text>
                      <Text className="text-xs text-zinc-400">{group.length}</Text>
                    </View>
                    {group.map((u) => (
                      <Pressable
                        key={`${key}-${u.userId}`}
                        onPress={() => openProfile(u.alias)}
                        className="flex-row items-center gap-1.5 py-1 pl-1"
                      >
                        <Text className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                          &apos;{u.alias}
                        </Text>
                        {u.level != null ? <LevelBadge level={u.level} /> : null}
                        <Text className="text-xs text-zinc-400">•</Text>
                        <Text className="text-xs text-zinc-400">{formatTimePassed(u.createdAt)}</Text>
                      </Pressable>
                    ))}
                  </View>
                );
              })
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
