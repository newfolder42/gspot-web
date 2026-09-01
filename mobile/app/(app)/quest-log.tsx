import { ActivityIndicator, Pressable, Text, View, SectionList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { questsApi } from '@/lib/quests';
import type { AvailableQuestType, UserQuestLogEntryType } from '@/types/quest';
import { useTheme } from '@/constants/colors';

type Row =
  | { kind: 'log'; entry: UserQuestLogEntryType }
  | { kind: 'available'; quest: AvailableQuestType };

function QuestAvatar({ name, avatarUrl }: { name: string | null; avatarUrl: string | null }) {
  if (name || avatarUrl) {
    return <ProfileAvatar name={name ?? '?'} photoUrl={avatarUrl} size={40} shape="full" />;
  }
  return (
    <View className="h-10 w-10 rounded-md bg-amber-500 items-center justify-center">
      <Feather name="flag" size={16} color="#fff" />
    </View>
  );
}

function LogRow({ entry }: { entry: UserQuestLogEntryType }) {
  const router = useRouter();
  const theme = useTheme();
  const isCompleted = entry.status === 'completed';
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/(app)/zone/[slug]/quests/[questId]', params: { slug: entry.zoneSlug, questId: String(entry.questId) } })}
      className={`flex-row items-center gap-3 p-3 mb-2 rounded-xl border ${
        isCompleted ? 'border-teal-200 dark:border-teal-800 bg-teal-50/40 dark:bg-teal-950/10' : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
      }`}
    >
      <QuestAvatar name={entry.characterName} avatarUrl={entry.characterAvatarUrl} />
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
      <Feather name="chevron-right" size={18} color={theme.icon} />
    </Pressable>
  );
}

function AvailableRow({ quest }: { quest: AvailableQuestType }) {
  const router = useRouter();
  const theme = useTheme();
  const locked = !!quest.lockReason;
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/(app)/zone/[slug]/quests/[questId]', params: { slug: quest.zoneSlug, questId: String(quest.questId) } })}
      className={`flex-row items-center gap-3 p-3 mb-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 ${locked ? 'opacity-60' : ''}`}
    >
      <QuestAvatar name={quest.characterName} avatarUrl={quest.characterAvatarUrl} />
      <View className="flex-1 min-w-0">
        <Text className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{quest.questTitle}</Text>
        {locked ? (
          <View className="flex-row items-center gap-1 mt-0.5">
            <Feather name="lock" size={11} color={theme.icon} />
            <Text className="text-xs text-zinc-500 dark:text-zinc-400">{quest.lockReason}</Text>
          </View>
        ) : (
          <Text className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {quest.zoneName} · {quest.objectiveCount} ამოცანა · {quest.completedCount} დაასრულა
          </Text>
        )}
      </View>
      <Feather name="chevron-right" size={18} color={theme.icon} />
    </Pressable>
  );
}

export default function QuestLogScreen() {
  const insets = useSafeAreaInsets();
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

  const current = data.entries.filter((e) => e.status !== 'completed');
  const completed = data.entries.filter((e) => e.status === 'completed');

  const sections: { title: string; first: boolean; data: Row[] }[] = [];
  const pushSection = (title: string, rows: Row[]) => {
    if (rows.length > 0) sections.push({ title, first: sections.length === 0, data: rows });
  };
  pushSection('მიმდინარე', current.map((entry) => ({ kind: 'log', entry })));
  pushSection('ხელმისაწვდომი', data.available.map((quest) => ({ kind: 'available', quest })));
  pushSection('დასრულებული', completed.map((entry) => ({ kind: 'log', entry })));

  return (
    <SectionList
      className="flex-1 bg-zinc-50 dark:bg-zinc-950"
      contentContainerStyle={{ padding: 16, paddingBottom: 16 + insets.bottom }}
      sections={sections}
      stickySectionHeadersEnabled={false}
      keyExtractor={(row) => (row.kind === 'log' ? `log-${row.entry.userQuestId}` : `available-${row.quest.questId}`)}
      renderSectionHeader={({ section }) => (
        <Text
          className={`text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-2 ${
            section.first ? '' : 'mt-4'
          }`}
        >
          {section.title}
        </Text>
      )}
      renderItem={({ item }) =>
        item.kind === 'log' ? <LogRow entry={item.entry} /> : <AvailableRow quest={item.quest} />
      }
      ListEmptyComponent={
        <View className="py-16 items-center">
          <Text className="text-sm text-zinc-500 dark:text-zinc-400">ჯერ არ აგიღია მისია.</Text>
        </View>
      }
    />
  );
}
