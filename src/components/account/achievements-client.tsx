'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import type { AccountAchievement } from '@/types/achievement';
import type { RewardDefinition } from '@/types/reward';
import { formatPhotoTakenDate } from '@/lib/dates';
import { TrophyIcon, QuestionMarkIcon } from '@/components/icons';
import { RewardSpecTiles } from '@/components/rewards/reward-tile';
import type { ItemDefinition } from '@/types/item';

type Props = {
  achievements: AccountAchievement[];
  rewardDefinitions: RewardDefinition[];
  itemDefinitions: ItemDefinition[];
};

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

function sortCategories(categories: string[]) {
  return [...categories].sort((a, b) => {
    const left = CATEGORY_ORDER.indexOf(a);
    const right = CATEGORY_ORDER.indexOf(b);
    const leftIndex = left === -1 ? 999 : left;
    const rightIndex = right === -1 ? 999 : right;
    return leftIndex - rightIndex;
  });
}

function sortByMilestone(a: AccountAchievement, b: AccountAchievement) {
  const left = a.maxProgress ?? Number.MAX_SAFE_INTEGER;
  const right = b.maxProgress ?? Number.MAX_SAFE_INTEGER;

  if (left !== right) return left - right;
  return a.achievementId - b.achievementId;
}

/** Hidden and not yet earned: the name, the progress and the rewards stay withheld. */
function isMystery(item: AccountAchievement) {
  return item.state === 'hidden' && !item.isAchieved;
}

function groupAchievements(items: AccountAchievement[]) {
  const grouped = items.reduce<Record<string, AccountAchievement[]>>((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }

    acc[item.category].push(item);
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
  if (item.maxProgress == null) {
    return `${item.progress}`;
  }

  return `${Math.min(item.progress, item.maxProgress)} / ${item.maxProgress}`;
}

function progressPercent(item: AccountAchievement) {
  if (item.maxProgress == null || item.maxProgress <= 0) {
    return 0;
  }

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
  const mystery = isMystery(item);
  const achieved = item.isAchieved;
  /** Earned, and it was one of the secret ones: the card keeps a mystery mark. */
  const secretEarned = item.state === 'hidden' && achieved;

  return (
    <article
      className={`relative rounded-lg border p-3 ${
        achieved
          ? 'border-teal-500/70 bg-teal-50/50 dark:border-teal-800 dark:bg-teal-950/20'
          : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <div
            className={`h-14 w-14 rounded-md border-2 overflow-hidden flex items-center justify-center ${
              achieved ? 'border-teal-500 dark:border-teal-600' : 'border-zinc-300 dark:border-zinc-700'
            }`}
          >
            {mystery ? (
              <QuestionMarkIcon className="w-7 h-7 text-zinc-400 dark:text-zinc-600" />
            ) : item.imageUrl ? (
              <Image
                src={item.imageUrl}
                alt={item.name}
                width={56}
                height={56}
                className={`h-full w-full object-cover ${achieved ? '' : 'grayscale opacity-60'}`}
              />
            ) : (
              <TrophyIcon className={`w-6 h-6 ${achieved ? 'text-teal-600' : 'text-zinc-400 dark:text-zinc-600'}`} />
            )}
          </div>

          {secretEarned && (
            <span
              title="დამალული მიღწევა"
              className="absolute -bottom-1.5 -right-1.5 h-5 w-5 rounded-full bg-amber-500 text-white flex items-center justify-center ring-2 ring-white dark:ring-zinc-900"
            >
              <QuestionMarkIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          {mystery ? (
            <h3 className="text-sm font-semibold tracking-widest text-zinc-400 dark:text-zinc-600">???</h3>
          ) : (
            <h3 className="text-sm font-semibold truncate text-zinc-900 dark:text-zinc-100">{item.name}</h3>
          )}

          {!mystery && (
            <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              <div className="flex items-start justify-between gap-2">
                <p className="tabular-nums">პროგრესი: {progressText(item)}</p>
                {achieved && item.achievedAt && <p className="shrink-0">{formatPhotoTakenDate(item.achievedAt)}</p>}
              </div>

              {!achieved && (
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-teal-600 transition-all duration-300"
                    style={{ width: `${progressPercent(item)}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {!mystery && item.rewards.length > 0 && (
        <div className="mt-3">
          <RewardSpecTiles rewards={item.rewards} definitions={rewardDefinitions} itemDefinitions={itemDefinitions} size="sm" />
        </div>
      )}
    </article>
  );
}

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
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? 'true' : undefined}
      className={`w-full text-left px-2.5 py-2 border-l-2 transition ${
        active
          ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/40'
          : 'border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
      }`}
    >
      <div className="flex items-baseline justify-between gap-1.5">
        <span
          className={`text-xs sm:text-sm font-medium truncate ${
            active ? 'text-teal-700 dark:text-teal-300' : 'text-zinc-700 dark:text-zinc-300'
          }`}
        >
          {label}
        </span>
        {hasProgress && (
          <span className="shrink-0 text-[10px] tabular-nums text-zinc-400 dark:text-zinc-500">
            {achieved}/{total}
          </span>
        )}
      </div>

      {hasProgress && (
        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div className="h-full rounded-full bg-teal-600" style={{ width: `${percent}%` }} />
        </div>
      )}
    </button>
  );
}

export default function AchievementsClient({ achievements, rewardDefinitions, itemDefinitions }: Props) {
  const [activeCategory, setActiveCategory] = useState<string>(OVERVIEW);

  const grouped = useMemo(() => groupAchievements(achievements), [achievements]);
  const orderedCategories = useMemo(() => sortCategories(Object.keys(grouped)), [grouped]);

  const categoryStats = useMemo(() => {
    const stats: Record<string, { achieved: number; total: number }> = {};
    for (const item of achievements) {
      if (!stats[item.category]) stats[item.category] = { achieved: 0, total: 0 };
      stats[item.category].total += 1;
      if (item.isAchieved) stats[item.category].achieved += 1;
    }
    return stats;
  }, [achievements]);

  const recentAchievements = useMemo(() => {
    return achievements
      .filter((item) => item.isAchieved && item.achievedAt)
      .sort((a, b) => new Date(b.achievedAt as string).getTime() - new Date(a.achievedAt as string).getTime())
      .slice(0, 5);
  }, [achievements]);

  // Mystery slots are skipped here: with the progress withheld they would be a blank card.
  const inProgressAchievements = useMemo(() => {
    return achievements
      .filter((item) => !item.isAchieved && item.progress > 0 && !isMystery(item))
      .sort((a, b) => progressPercent(b) - progressPercent(a))
      .slice(0, 5);
  }, [achievements]);

  const totalAchievements = achievements.length;
  const achievedAchievements = achievements.filter((a) => a.isAchieved).length;
  const achievementPercent =
    totalAchievements > 0 ? Math.round((achievedAchievements / totalAchievements) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
        <div className="flex items-center gap-3">
          <div className="shrink-0 h-12 w-12 rounded-md bg-teal-600 flex items-center justify-center">
            <TrophyIcon className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">მიღწევები</h1>
              <span className="text-xs font-medium text-teal-700 dark:text-teal-400 shrink-0">
                {achievedAchievements} / {totalAchievements} · {achievementPercent}%
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-teal-600 transition-all duration-500"
                style={{ width: `${achievementPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <nav className="w-32 sm:w-56 shrink-0 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
          <CategoryRailButton
            label="მიმოხილვა"
            active={activeCategory === OVERVIEW}
            onSelect={() => setActiveCategory(OVERVIEW)}
          />
          {orderedCategories.map((category) => (
            <CategoryRailButton
              key={category}
              label={CATEGORY_LABELS[category] ?? category}
              achieved={categoryStats[category]?.achieved ?? 0}
              total={categoryStats[category]?.total ?? 0}
              active={activeCategory === category}
              onSelect={() => setActiveCategory(category)}
            />
          ))}
        </nav>

        <div className="min-w-0 flex-1">
          {activeCategory === OVERVIEW ? (
            <div className="space-y-6">
              <section className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  ბოლო მიღწევები
                </h2>
                {recentAchievements.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {recentAchievements.map((item) => (
                      <AchievementCard
                        key={item.key}
                        item={item}
                        rewardDefinitions={rewardDefinitions}
                        itemDefinitions={itemDefinitions}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">ჯერ არცერთი მიღწევა არ გაქვს.</p>
                )}
              </section>

              {inProgressAchievements.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    მიმდინარე
                  </h2>
                  <div className="flex flex-col gap-3">
                    {inProgressAchievements.map((item) => (
                      <AchievementCard
                        key={item.key}
                        item={item}
                        rewardDefinitions={rewardDefinitions}
                        itemDefinitions={itemDefinitions}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {(grouped[activeCategory] ?? []).map((item) => (
                <AchievementCard
                  key={item.key}
                  item={item}
                  rewardDefinitions={rewardDefinitions}
                  itemDefinitions={itemDefinitions}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
