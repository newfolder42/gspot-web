'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import type { AccountAchievement } from '@/types/achievement';
import type { RewardDefinition } from '@/types/reward';
import { formatPhotoTakenDate } from '@/lib/dates';
import { CheckmarkCircleIcon, TrophyIcon, MaskIcon } from '@/components/icons';
import { RewardSpecTiles } from '@/components/rewards/reward-tile';

type Props = {
  achievements: AccountAchievement[];
  rewardDefinitions: RewardDefinition[];
};

const CATEGORY_LABELS: Record<string, string> = {
  base: 'ძირითადი',
  posts: 'პოსტები',
  guesses: 'გამოცნობები',
  streaks: 'უწყვეტობა',
  level: 'დონეები',
};

const CATEGORY_ORDER = ['base', 'posts', 'guesses', 'streaks', 'level'];

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

function compactMilestones(items: AccountAchievement[]) {
  const groupedByTrack = items.reduce<Record<string, AccountAchievement[]>>((acc, item) => {
    const key = `${item.trackId}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const compact: AccountAchievement[] = [];

  for (const milestones of Object.values(groupedByTrack)) {
    const sorted = [...milestones].sort(sortByMilestone);
    const achieved = sorted.filter((item) => item.isAchieved);
    const highestAchieved = achieved.length > 0 ? achieved[achieved.length - 1] : null;
    const nextPending = sorted.find((item) => !item.isAchieved) ?? null;

    if (nextPending) {
      compact.push(nextPending);
    } else if (highestAchieved) {
      compact.push(highestAchieved);
    }
  }

  return compact;
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

function isSecret(item: AccountAchievement) {
  return item.state === 'hidden' && !item.isAchieved && !item.inProgress;
}

function AchievementCard({
  item,
  rewardDefinitions,
}: {
  item: AccountAchievement;
  rewardDefinitions: RewardDefinition[];
}) {
  const secret = isSecret(item);
  const achieved = item.isAchieved;
  const showBar = !secret && item.maxProgress != null && item.maxProgress > 1;

  return (
    <article
      className="relative rounded-lg border p-3 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
    >
      <div className="flex items-start gap-3">
        <div
          className={`relative shrink-0 h-14 w-14 rounded-md border-2 overflow-hidden flex items-center justify-center ${
            achieved
              ? 'border-teal-500 dark:border-teal-600 bg-teal-100 dark:bg-teal-900/30'
              : 'border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800'
          }`}
        >
          {secret ? (
            <MaskIcon className="w-6 h-6 text-zinc-400 dark:text-zinc-600" />
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

          {achieved && (
            <span className="absolute -bottom-1.5 -right-1.5 rounded-full bg-white dark:bg-zinc-900 p-0.5 shadow">
              <CheckmarkCircleIcon className="w-4 h-4 text-teal-600" strokeWidth={2.5} />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3
            className={`text-sm font-semibold truncate ${
              secret ? 'text-zinc-400 dark:text-zinc-600' : 'text-zinc-900 dark:text-zinc-100'
            }`}
          >
            {secret ? 'დამალული მიღწევა' : item.name}
          </h3>

          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            <div className="flex items-center justify-between gap-2">
              {achieved && item.achievedAt && <p>{formatPhotoTakenDate(item.achievedAt)}</p>}
              {!secret && item.maxProgress !== 1 && <p>პროგრესი: {progressText(item)}</p>}
            </div>

            {showBar && (
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-teal-600 transition-all duration-300"
                  style={{ width: `${progressPercent(item)}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {!secret && item.rewards.length > 0 && (
        <div className="mt-3">
          <RewardSpecTiles rewards={item.rewards} definitions={rewardDefinitions} size="sm" />
        </div>
      )}
    </article>
  );
}

function CategoryProgressRow({
  category,
  achieved,
  total,
  onSelect,
}: {
  category: string;
  achieved: number;
  total: number;
  onSelect: () => void;
}) {
  const percent = total > 0 ? Math.round((achieved / total) * 100) : 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full text-left rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition"
    >
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium text-zinc-900 dark:text-zinc-100">{CATEGORY_LABELS[category] ?? category}</span>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">{achieved} / {total}</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div className="h-full rounded-full bg-teal-600" style={{ width: `${percent}%` }} />
      </div>
    </button>
  );
}

export default function AchievementsClient({ achievements, rewardDefinitions }: Props) {
  const [showAllMilestones, setShowAllMilestones] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>(OVERVIEW);

  const visibleAchievements = useMemo(() => {
    if (showAllMilestones) return achievements;
    return compactMilestones(achievements);
  }, [achievements, showAllMilestones]);

  const grouped = useMemo(() => groupAchievements(visibleAchievements), [visibleAchievements]);
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

  const overviewCategories = useMemo(() => sortCategories(Object.keys(categoryStats)), [categoryStats]);

  const recentAchievements = useMemo(() => {
    return achievements
      .filter((item) => item.isAchieved && item.achievedAt)
      .sort((a, b) => new Date(b.achievedAt as string).getTime() - new Date(a.achievedAt as string).getTime())
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

        <label className="mt-3 inline-flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 select-none cursor-pointer">
          <input
            type="checkbox"
            checked={showAllMilestones}
            onChange={(event) => setShowAllMilestones(event.target.checked)}
            className="h-3.5 w-3.5 rounded border-zinc-300 dark:border-zinc-600 accent-teal-600"
          />
          დეტალური ჩვენება
        </label>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveCategory(OVERVIEW)}
          className={`shrink-0 rounded-md border px-3 py-1.5 text-xs font-medium transition ${
            activeCategory === OVERVIEW
              ? 'border-teal-600 bg-teal-600 text-white'
              : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
          }`}
        >
          მიმოხილვა
        </button>
        {orderedCategories.map((category) => {
          const stats = categoryStats[category];
          return (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`shrink-0 rounded-md border px-3 py-1.5 text-xs font-medium transition ${
                activeCategory === category
                  ? 'border-teal-600 bg-teal-600 text-white'
                  : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              }`}
            >
              {CATEGORY_LABELS[category] ?? category}
              {stats && (
                <span className={`ml-1.5 ${activeCategory === category ? 'text-white/80' : 'text-zinc-400 dark:text-zinc-500'}`}>
                  {stats.achieved}/{stats.total}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {activeCategory === OVERVIEW ? (
        <div className="space-y-6">
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              ბოლო მიღწევები
            </h2>
            {recentAchievements.length > 0 ? (
              <div className="flex flex-col gap-3">
                {recentAchievements.map((item) => (
                  <AchievementCard key={item.key} item={item} rewardDefinitions={rewardDefinitions} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">ჯერ არცერთი მიღწევა არ გაქვს.</p>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              კატეგორიები
            </h2>
            <div className="flex flex-col gap-3">
              {overviewCategories.map((category) => (
                <CategoryProgressRow
                  key={category}
                  category={category}
                  achieved={categoryStats[category].achieved}
                  total={categoryStats[category].total}
                  onSelect={() => setActiveCategory(category)}
                />
              ))}
            </div>
          </section>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {(grouped[activeCategory] ?? []).map((item) => (
            <AchievementCard key={item.key} item={item} rewardDefinitions={rewardDefinitions} />
          ))}
        </div>
      )}
    </div>
  );
}
