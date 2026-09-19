import { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { usersApi } from '@/lib/users';
import { formatPhotoTakenDate } from '@/lib/dates';
import type { AccountAchievement } from '@/types/achievement';
import type { RewardDefinition } from '@/types/reward';
import type { ItemDefinition } from '@/types/item';
import { RewardSpecTiles } from '@/components/rewards/RewardSpecTiles';
import { Colors, useTheme } from '@/constants/colors';

const CATEGORY_LABELS: Record<string, string> = {
  base: 'ძირითადი',
  posts: 'პოსტები',
  guesses: 'გამოცნობები',
  quests: 'მისიები',
  hide_and_seek: 'დამალობანა',
  streaks: 'უწყვეტობა',
  level: 'დონეები',
  items: 'ნივთები',
};

const CATEGORY_ORDER = ['base', 'posts', 'guesses', 'quests', 'hide_and_seek', 'streaks', 'items', 'level'];

const OVERVIEW = '__overview__';

function sortByMilestone(a: AccountAchievement, b: AccountAchievement) {
  const left = a.maxProgress ?? Number.MAX_SAFE_INTEGER;
  const right = b.maxProgress ?? Number.MAX_SAFE_INTEGER;
  if (left !== right) return left - right;
  return a.achievementId - b.achievementId;
}

/** Hidden and not yet earned: the name, the progress and the rewards stay withheld, as on web. */
function isMystery(item: AccountAchievement) {
  return item.state === 'hidden' && !item.isAchieved;
}

function groupAchievements(items: AccountAchievement[]) {
  const grouped = items.reduce<Record<string, AccountAchievement[]>>((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {});
  for (const category of Object.keys(grouped)) {
    grouped[category].sort((a, b) => {
      // The blank mystery slots sink under everything the player can read.
      const mystery = Number(isMystery(a)) - Number(isMystery(b));
      if (mystery !== 0) return mystery;

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

function AchievementCard({
  item,
  rewardDefinitions,
  itemDefinitions,
}: {
  item: AccountAchievement;
  rewardDefinitions: RewardDefinition[];
  itemDefinitions: ItemDefinition[];
}) {
  const theme = useTheme();
  const mystery = isMystery(item);
  const achieved = item.isAchieved;
  /** Earned, and it was one of the secret ones: the card keeps a mystery mark. */
  const secretEarned = item.state === 'hidden' && achieved;

  return (
    <View
      className={`rounded-md border p-2.5 mb-2.5 ${
        achieved
          ? 'border-teal-500 bg-teal-50 dark:border-teal-800 dark:bg-teal-950/30'
          : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
      }`}
    >
      <View className="flex-row items-start gap-2.5">
        <View>
          <View
            className={`h-11 w-11 rounded-md border-2 overflow-hidden items-center justify-center bg-zinc-100 dark:bg-zinc-800 ${
              achieved ? 'border-teal-500 dark:border-teal-600' : 'border-zinc-300 dark:border-zinc-700'
            }`}
          >
            {mystery ? (
              <Feather name="help-circle" size={22} color={theme.iconFaint} />
            ) : item.imageUrl ? (
              <Image
                source={{ uri: item.imageUrl }}
                className="h-full w-full"
                resizeMode="cover"
                style={achieved ? undefined : { opacity: 0.6 }}
              />
            ) : (
              <Feather name="award" size={20} color={achieved ? Colors.brand : theme.icon} />
            )}
          </View>

          {secretEarned ? (
            <View className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-amber-500 items-center justify-center">
              <Text className="text-[10px] font-bold leading-[12px] text-white">?</Text>
            </View>
          ) : null}
        </View>

        <View className="flex-1 min-w-0">
          {mystery ? (
            <Text className="text-sm font-semibold tracking-widest text-zinc-400 dark:text-zinc-600">???</Text>
          ) : (
            <Text className="text-sm font-medium text-zinc-900 dark:text-zinc-100" numberOfLines={1}>
              {item.name}
            </Text>
          )}

          {!mystery ? (
            <>
              <View className="mt-1 flex-row items-center justify-between gap-2">
                <Text className="text-[11px] text-zinc-500 dark:text-zinc-400 flex-shrink" numberOfLines={1}>
                  პროგრესი: {progressText(item)}
                </Text>
                {achieved && item.achievedAt ? (
                  <Text className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {formatPhotoTakenDate(item.achievedAt)}
                  </Text>
                ) : null}
              </View>

              {!achieved ? (
                <View className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                  <View className="h-full rounded-full bg-teal-600" style={{ width: `${progressPercent(item)}%` }} />
                </View>
              ) : null}
            </>
          ) : null}
        </View>
      </View>

      {!mystery && (item.rewards?.length ?? 0) > 0 ? (
        <View className="mt-2.5">
          <RewardSpecTiles rewards={item.rewards} definitions={rewardDefinitions} itemDefinitions={itemDefinitions} />
        </View>
      ) : null}
    </View>
  );
}

/** One row of the World-of-Warcraft-style category rail down the left edge. */
function CategoryRailButton({
  label,
  achieved,
  total,
  active,
  onSelect,
}: {
  label: string;
  achieved?: number;
  total?: number;
  active: boolean;
  onSelect: () => void;
}) {
  const hasProgress = achieved != null && total != null;
  const percent = hasProgress && total > 0 ? Math.round((achieved / total) * 100) : 0;

  return (
    <Pressable
      onPress={onSelect}
      className={`px-2 py-2 border-l-2 ${
        active ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/40' : 'border-transparent'
      }`}
    >
      <Text
        className={`text-[11px] font-medium ${
          active ? 'text-teal-700 dark:text-teal-300' : 'text-zinc-700 dark:text-zinc-300'
        }`}
        numberOfLines={1}
      >
        {label}
      </Text>

      {hasProgress ? (
        <View className="mt-1.5 flex-row items-center gap-1.5">
          <View className="flex-1 h-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <View className="h-full rounded-full bg-teal-600" style={{ width: `${percent}%` }} />
          </View>
          <Text className="text-[9px] text-zinc-400 dark:text-zinc-500">
            {achieved}/{total}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function AchievementsTab({ alias }: { alias: string }) {
  const [activeCategory, setActiveCategory] = useState<string>(OVERVIEW);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['achievements', alias],
    queryFn: () => usersApi.getAchievements(alias),
    enabled: !!alias,
  });

  const achievements = useMemo(() => data?.achievements ?? [], [data]);
  const rewardDefinitions = useMemo(() => data?.rewardDefinitions ?? [], [data]);
  const itemDefinitions = useMemo(() => data?.itemDefinitions ?? [], [data]);

  const grouped = useMemo(() => groupAchievements(achievements), [achievements]);
  const orderedCategories = useMemo(
    () =>
      Object.keys(grouped).sort((a, b) => {
        const l = CATEGORY_ORDER.indexOf(a);
        const r = CATEGORY_ORDER.indexOf(b);
        return (l === -1 ? 999 : l) - (r === -1 ? 999 : r);
      }),
    [grouped]
  );

  const categoryStats = useMemo(() => {
    const stats: Record<string, { achieved: number; total: number }> = {};
    for (const item of achievements) {
      (stats[item.category] ??= { achieved: 0, total: 0 }).total += 1;
      if (item.isAchieved) stats[item.category].achieved += 1;
    }
    return stats;
  }, [achievements]);

  const recentAchievements = useMemo(
    () =>
      achievements
        .filter((item) => item.isAchieved && item.achievedAt)
        .sort((a, b) => new Date(b.achievedAt as string).getTime() - new Date(a.achievedAt as string).getTime())
        .slice(0, 5),
    [achievements]
  );

  // Mystery slots are skipped here: with the progress withheld they would be a blank card.
  const inProgressAchievements = useMemo(
    () =>
      achievements
        .filter((item) => !item.isAchieved && item.progress > 0 && !isMystery(item))
        .sort((a, b) => progressPercent(b) - progressPercent(a))
        .slice(0, 5),
    [achievements]
  );

  const total = achievements.length;
  const achieved = achievements.filter((a) => a.isAchieved).length;
  const percent = total > 0 ? Math.round((achieved / total) * 100) : 0;

  if (isLoading) {
    return <View className="py-10 items-center"><ActivityIndicator color={Colors.brand} /></View>;
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
    <View className="px-3 py-3">
      <View className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 mb-3">
        <View className="flex-row items-baseline justify-between gap-2">
          <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">მიღწევები</Text>
          <Text className="text-xs font-medium text-teal-700 dark:text-teal-400">
            {achieved} / {total} · {percent}%
          </Text>
        </View>
        <View className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <View className="h-full rounded-full bg-teal-600" style={{ width: `${percent}%` }} />
        </View>
      </View>

      <View className="flex-row items-start gap-2">
        <View className="w-24 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
          <CategoryRailButton
            label="მიმოხილვა"
            active={activeCategory === OVERVIEW}
            onSelect={() => setActiveCategory(OVERVIEW)}
          />
          {orderedCategories.map((category) => (
            <View key={category} className="border-t border-zinc-100 dark:border-zinc-800">
              <CategoryRailButton
                label={CATEGORY_LABELS[category] ?? category}
                achieved={categoryStats[category]?.achieved ?? 0}
                total={categoryStats[category]?.total ?? 0}
                active={activeCategory === category}
                onSelect={() => setActiveCategory(category)}
              />
            </View>
          ))}
        </View>

        <View className="flex-1 min-w-0">
          {activeCategory === OVERVIEW ? (
            <>
              <Text className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400 mb-2">
                ბოლო მიღწევები
              </Text>
              {recentAchievements.length > 0 ? (
                recentAchievements.map((item) => (
                  <AchievementCard
                    key={item.key}
                    item={item}
                    rewardDefinitions={rewardDefinitions}
                    itemDefinitions={itemDefinitions}
                  />
                ))
              ) : (
                <Text className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">ჯერ არცერთი მიღწევა არ გაქვს.</Text>
              )}

              {inProgressAchievements.length > 0 ? (
                <>
                  <Text className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400 mt-3 mb-2">
                    მიმდინარე
                  </Text>
                  {inProgressAchievements.map((item) => (
                    <AchievementCard
                      key={item.key}
                      item={item}
                      rewardDefinitions={rewardDefinitions}
                      itemDefinitions={itemDefinitions}
                    />
                  ))}
                </>
              ) : null}
            </>
          ) : (
            (grouped[activeCategory] ?? []).map((item) => (
              <AchievementCard
                key={item.key}
                item={item}
                rewardDefinitions={rewardDefinitions}
                itemDefinitions={itemDefinitions}
              />
            ))
          )}
        </View>
      </View>
    </View>
  );
}
