import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { RewardIcon } from '@/components/rewards/RewardIcon';
import { rewardsApi } from '@/lib/rewards';
import { getSelectableRewardsForTarget } from '@/types/reward';
import type { RewardSummaryType, RewardTarget } from '@/types/reward';

type Props = {
  postId: number;
  commentId: number | null;
  target: RewardTarget;
  onClose: () => void;
  onGiven: (summary: RewardSummaryType) => void;
};

/**
 * Reward picker — mirrors the web RewardDialog. The catalog, unlock state and
 * remaining quota are fetched on open (never on feed/post load), matching web.
 */
export function RewardSheet({ postId, commentId, target, onClose, onGiven }: Props) {
  const [givingKey, setGivingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: status, isLoading } = useQuery({
    queryKey: ['reward-status'],
    queryFn: () => rewardsApi.getStatus(),
    staleTime: 30_000,
  });

  const selectable = status
    ? getSelectableRewardsForTarget(status.definitions, target).filter(
        (d) => !d.unlockable || status.unlockedKeys.includes(d.key)
      )
    : [];

  const handleGive = async (key: string) => {
    if (givingKey) return;
    if (status && status.remainingToday <= 0) return;
    setError(null);
    setGivingKey(key);
    try {
      const next = await rewardsApi.give(postId, commentId, key);
      onGiven(next);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ჯილდოს გაცემა ვერ მოხერხდა.');
    } finally {
      setGivingKey(null);
    }
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
          {/* Header */}
          <View className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">ჯილდოს გაცემა</Text>
            <Pressable onPress={onClose} hitSlop={8} className="p-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800">
              <Feather name="x" size={15} color="#71717A" />
            </Pressable>
          </View>

          {/* Catalog */}
          <View className="px-4 py-4">
            {isLoading ? (
              <View className="py-6 items-center">
                <ActivityIndicator color="#14B8A6" />
              </View>
            ) : selectable.length === 0 ? (
              <Text className="py-6 text-center text-sm text-zinc-600 dark:text-zinc-300">
                ჯილდოები ამ ადგილას მიუწვდომელია.
              </Text>
            ) : (
              <ScrollView style={{ maxHeight: 320 }}>
                <View className="flex-row flex-wrap" style={{ marginHorizontal: -4 }}>
                  {selectable.map((def) => (
                    <View key={def.key} style={{ width: '33.333%', padding: 4 }}>
                      <Pressable
                        onPress={() => handleGive(def.key)}
                        disabled={!!givingKey}
                        className="items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 px-2 py-3 active:border-teal-500"
                        style={{ opacity: givingKey && givingKey !== def.key ? 0.5 : 1 }}
                      >
                        {givingKey === def.key ? (
                          <View style={{ height: 36, justifyContent: 'center' }}>
                            <ActivityIndicator size="small" color="#14B8A6" />
                          </View>
                        ) : (
                          <RewardIcon iconUrl={def.iconUrl} size={36} />
                        )}
                        <Text
                          className="text-xs font-medium text-zinc-700 dark:text-zinc-200 text-center"
                          numberOfLines={2}
                        >
                          {def.name}
                        </Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}

            {error ? (
              <Text className="mt-3 text-center text-sm text-rose-600 dark:text-rose-400">{error}</Text>
            ) : null}
          </View>

          {/* Remaining quota */}
          {status ? (
            <View className="px-4 py-2 border-t border-zinc-200 dark:border-zinc-800">
              <Text className="text-center text-xs text-zinc-400">
                დღეს დარჩენილია {status.remainingToday}/{status.dailyLimit}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
