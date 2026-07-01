import { ActivityIndicator, Pressable, Text, View, FlatList } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { questsApi } from '@/lib/quests';
import type { UserQuestLogEntryType } from '@/types/quest';

function LogRow({ entry }: { entry: UserQuestLogEntryType }) {
  const router = useRouter();
  const isCompleted = entry.status === 'completed';
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/(app)/zone/[slug]/quests/[questId]', params: { slug: entry.zoneSlug, questId: String(entry.questId) } })}
      className={`flex-row items-center gap-3 p-3 mb-2 rounded-xl border ${
        isCompleted ? 'border-teal-200 dark:border-teal-800 bg-teal-50/40 dark:bg-teal-950/10' : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
      }`}
    >
      {entry.characterName || entry.characterAvatarUrl ? (
        <ProfileAvatar name={entry.characterName ?? '?'} photoUrl={entry.characterAvatarUrl} size={40} shape="full" />
      ) : (
        <View className="h-10 w-10 rounded-md bg-amber-500 items-center justify-center">
          <Feather name="flag" size={16} color="#fff" />
        </View>
      )}
      <View className="flex-1 min-w-0">
        <View className="flex-row items-center gap-1.5 flex-wrap">
          <Text className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{entry.questTitle}</Text>
          {isCompleted ? (
            <Text className="text-xs font-medium rounded-full px-1.5 py-0.5 bg-teal-100 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400">შესრულდა</Text>
          ) : (
            <Text className="text-xs font-medium rounded-full px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400">მიმდინარე</Text>
          )}
        </View>
        <Text className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          {entry.zoneName} · {entry.completedObjectiveCount}/{entry.objectiveCount} ამოცანა
        </Text>
      </View>
      <Feather name="chevron-right" size={18} color="#a1a1aa" />
    </Pressable>
  );
}

export default function QuestLogScreen() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['quest-log'],
    queryFn: () => questsApi.getLog(),
  });

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <ActivityIndicator size="large" color="#14B8A6" />
      </View>
    );
  }
  if (isError || !data) {
    return (
      <View className="flex-1 items-center justify-center px-8 bg-zinc-50 dark:bg-zinc-950">
        <Text className="text-zinc-500 dark:text-zinc-400 text-sm text-center mb-4">ჩატვირთვა ვერ მოხერხდა</Text>
        <Pressable onPress={() => refetch()} className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
          <Text className="text-brand text-sm font-semibold">ხელახლა ცდა</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      className="flex-1 bg-zinc-50 dark:bg-zinc-950"
      contentContainerStyle={{ padding: 16 }}
      data={data}
      keyExtractor={(e) => String(e.userQuestId)}
      renderItem={({ item }) => <LogRow entry={item} />}
      ListEmptyComponent={
        <View className="py-16 items-center">
          <Text className="text-sm text-zinc-500 dark:text-zinc-400">ჯერ არ აგიღია მისია.</Text>
        </View>
      }
    />
  );
}
