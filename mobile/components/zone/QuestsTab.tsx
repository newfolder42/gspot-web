import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { questsApi } from '@/lib/quests';
import type { ZoneQuestWithStatsType } from '@/types/quest';

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  active: { label: 'მიმდინარე', cls: 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400' },
  completed: { label: 'შესრულდა', cls: 'bg-teal-100 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400' },
};

function QuestRow({ quest, slug }: { quest: ZoneQuestWithStatsType; slug: string }) {
  const router = useRouter();
  const locked = !!quest.lockReason;
  const status = quest.myStatus ? STATUS_LABELS[quest.myStatus] : null;

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/(app)/zone/[slug]/quests/[questId]', params: { slug, questId: String(quest.id) } })}
      className={`flex-row items-center gap-3 px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 ${locked ? 'opacity-60' : ''}`}
    >
      {quest.characterAvatarUrl || quest.characterName ? (
        <ProfileAvatar name={quest.characterName ?? '?'} photoUrl={quest.characterAvatarUrl} size={44} shape="full" />
      ) : (
        <View className="h-11 w-11 rounded-md bg-amber-500 items-center justify-center">
          <Feather name="flag" size={18} color="#fff" />
        </View>
      )}
      <View className="flex-1 min-w-0">
        <View className="flex-row items-center gap-1.5 flex-wrap">
          <Text className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{quest.title}</Text>
          {status ? (
            <Text className={`text-xs font-medium rounded-full px-1.5 py-0.5 ${status.cls}`}>{status.label}</Text>
          ) : null}
        </View>
        {quest.characterName ? (
          <Text className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{quest.characterName}</Text>
        ) : null}
        {locked ? (
          <View className="flex-row items-center gap-1 mt-0.5">
            <Feather name="lock" size={11} color="#a1a1aa" />
            <Text className="text-xs text-zinc-400">{quest.lockReason}</Text>
          </View>
        ) : (
          <Text className="text-xs text-zinc-400 mt-0.5">
            {quest.objectiveCount} ამოცანა · {quest.completedCount} დაასრულა
          </Text>
        )}
      </View>
      <Feather name="chevron-right" size={18} color="#a1a1aa" />
    </Pressable>
  );
}

export function QuestsTab({ slug }: { slug: string }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['zone-quests', slug],
    queryFn: () => questsApi.getZoneQuests(slug),
    enabled: !!slug,
  });

  if (isLoading) {
    return <View className="py-10 items-center"><ActivityIndicator color="#14B8A6" /></View>;
  }
  if (isError || !data) {
    return (
      <View className="py-10 items-center px-8">
        <Text className="text-sm text-zinc-500 dark:text-zinc-400 mb-3 text-center">ჩატვირთვა ვერ მოხერხდა</Text>
        <Pressable onPress={() => refetch()} className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
          <Text className="text-brand text-sm font-semibold">ხელახლა ცდა</Text>
        </Pressable>
      </View>
    );
  }
  if (data.length === 0) {
    return (
      <View className="py-10 items-center px-8">
        <Text className="text-sm text-zinc-500 dark:text-zinc-400 text-center">მისიები ჯერ არ არის.</Text>
      </View>
    );
  }

  return (
    <View>
      {data.map((q) => (
        <QuestRow key={q.id} quest={q} slug={slug} />
      ))}
    </View>
  );
}
