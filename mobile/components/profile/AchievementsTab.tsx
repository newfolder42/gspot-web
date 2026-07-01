import { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, Switch, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { usersApi } from '@/lib/users';
import { formatPhotoTakenDate } from '@/lib/dates';
import type { AccountAchievement } from '@/types/achievement';

const CATEGORY_LABELS: Record<string, string> = {
  base: 'ძირითადი',
  posts: 'პოსტები',
  guesses: 'გამოცნობები',
  streaks: 'უწყვეტობა',
  level: 'დონეები',
};

const CATEGORY_ORDER = ['base', 'posts', 'guesses', 'streaks', 'level'];

function sortByMilestone(a: AccountAchievement, b: AccountAchievement) {
  const left = a.maxProgress ?? Number.MAX_SAFE_INTEGER;
  const right = b.maxProgress ?? Number.MAX_SAFE_INTEGER;
  if (left !== right) return left - right;
  return a.achievementId - b.achievementId;
}

function compactMilestones(items: AccountAchievement[]) {
  const byTrack = items.reduce<Record<string, AccountAchievement[]>>((acc, item) => {
    (acc[`${item.trackId}`] ??= []).push(item);
    return acc;
  }, {});

  const compact: AccountAchievement[] = [];
  for (const milestones of Object.values(byTrack)) {
    const sorted = [...milestones].sort(sortByMilestone);
    const achieved = sorted.filter((i) => i.isAchieved);
    const highestAchieved = achieved.length > 0 ? achieved[achieved.length - 1] : null;
    const nextPending = sorted.find((i) => !i.isAchieved) ?? null;
    if (nextPending) compact.push(nextPending);
    else if (highestAchieved) compact.push(highestAchieved);
  }
  return compact;
}

function groupAchievements(items: AccountAchievement[]) {
  const grouped = items.reduce<Record<string, AccountAchievement[]>>((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {});
  for (const category of Object.keys(grouped)) {
    grouped[category].sort((a, b) => {
      if (a.trackId !== b.trackId) return a.trackId - b.trackId;
      return sortByMilestone(a, b);
    });
  }
  return grouped;
}

function progressText(item: AccountAchievement) {
  if (item.maxProgress == null) return `${item.progress}`;
  return `${Math.min(item.progress, item.maxProgress)} / ${item.maxProgress}`;
}

function progressPercent(item: AccountAchievement) {
  if (item.maxProgress == null || item.maxProgress <= 0) return 0;
  return Math.round((Math.min(item.progress, item.maxProgress) / item.maxProgress) * 100);
}

function AchievementCard({ item }: { item: AccountAchievement }) {
  return (
    <View className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 mb-3">
      <View className="flex-row items-start gap-3">
        <View className="h-12 w-12 rounded-md overflow-hidden bg-zinc-100 dark:bg-zinc-800 items-center justify-center">
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} className="h-full w-full" resizeMode="cover" />
          ) : (
            <Text className="text-zinc-400 text-xs">სრთ</Text>
          )}
        </View>
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center justify-between gap-2">
            <Text className="text-sm font-medium text-zinc-900 dark:text-zinc-100 flex-1" numberOfLines={1}>
              {item.name}
            </Text>
            {item.isAchieved ? <Feather name="check-circle" size={18} color="#10b981" /> : null}
          </View>
          <View className="mt-1 flex-row items-center justify-between gap-2">
            {item.isAchieved && item.achievedAt ? (
              <Text className="text-xs text-zinc-500 dark:text-zinc-400">{formatPhotoTakenDate(item.achievedAt)}</Text>
            ) : null}
            {item.maxProgress !== 1 ? (
              <Text className="text-xs text-zinc-500 dark:text-zinc-400">პროგრესი: {progressText(item)}</Text>
            ) : null}
          </View>
          {item.maxProgress != null && item.maxProgress > 1 ? (
            <View className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-violet-100 dark:bg-violet-950/50">
              <View className="h-full rounded-full bg-violet-500" style={{ width: `${progressPercent(item)}%` }} />
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export function AchievementsTab({ alias }: { alias: string }) {
  const [showAll, setShowAll] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['achievements', alias],
    queryFn: () => usersApi.getAchievements(alias),
    enabled: !!alias,
  });

  const achievements = useMemo(() => data ?? [], [data]);

  const visible = useMemo(
    () => (showAll ? achievements : compactMilestones(achievements)),
    [achievements, showAll]
  );
  const grouped = useMemo(() => groupAchievements(visible), [visible]);
  const orderedCategories = useMemo(
    () =>
      Object.keys(grouped).sort((a, b) => {
        const l = CATEGORY_ORDER.indexOf(a);
        const r = CATEGORY_ORDER.indexOf(b);
        return (l === -1 ? 999 : l) - (r === -1 ? 999 : r);
      }),
    [grouped]
  );

  const total = achievements.length;
  const achieved = achievements.filter((a) => a.isAchieved).length;
  const percent = total > 0 ? Math.round((achieved / total) * 100) : 0;

  if (isLoading) {
    return <View className="py-10 items-center"><ActivityIndicator color="#14B8A6" /></View>;
  }

  if (isError) {
    return (
      <View className="py-10 items-center px-8">
        <Text className="text-sm text-zinc-500 dark:text-zinc-400 mb-3 text-center">ჩატვირთვა ვერ მოხერხდა</Text>
        <Pressable onPress={() => refetch()} className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
          <Text className="text-brand text-sm font-semibold">ხელახლა ცდა</Text>
        </Pressable>
      </View>
    );
  }

  if (total === 0) {
    return (
      <View className="py-10 items-center px-8">
        <Text className="text-sm text-zinc-500 dark:text-zinc-400 text-center">
          მიღწევები ჯერ არ არის ხელმისაწვდომი.
        </Text>
      </View>
    );
  }

  return (
    <View className="px-4 py-3">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2">
          <Switch
            value={showAll}
            onValueChange={setShowAll}
            trackColor={{ false: '#d4d4d8', true: '#14B8A6' }}
            thumbColor="#ffffff"
          />
          <Text className="text-sm text-zinc-700 dark:text-zinc-300">დეტალური ჩვენება</Text>
        </View>
        <Text className="text-xs text-zinc-600 dark:text-zinc-400">მიღწეული: {achieved} / {total}</Text>
      </View>

      <View className="h-1.5 w-full overflow-hidden rounded-full bg-violet-100 dark:bg-violet-950/50 mb-5">
        <View className="h-full rounded-full bg-violet-500" style={{ width: `${percent}%` }} />
      </View>

      {orderedCategories.map((category) => (
        <View key={category} className="mb-5">
          <Text className="text-sm font-semibold uppercase text-zinc-500 dark:text-zinc-400 mb-3">
            {CATEGORY_LABELS[category] ?? category}
          </Text>
          {grouped[category].map((item) => (
            <AchievementCard key={item.key} item={item} />
          ))}
        </View>
      ))}
    </View>
  );
}
