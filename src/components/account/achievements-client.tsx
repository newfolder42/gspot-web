'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import type { AccountAchievement } from '@/types/achievement';
import { formatPhotoTakenDate } from '@/lib/dates';

type Props = {
  achievements: AccountAchievement[];
};

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

    // Default view should show only the current milestone per track.
    // If there is a pending milestone, it is the current one; otherwise show the latest achieved.
    if (nextPending) {
      compact.push(nextPending);
    } else if (highestAchieved) {
      compact.push(highestAchieved);
    }
  }

  return compact;
}

function getInProgressMilestoneKeys(items: AccountAchievement[]) {
  const groupedByTrack = items.reduce<Record<string, AccountAchievement[]>>((acc, item) => {
    const key = `${item.trackId}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const keys = new Set<string>();

  for (const milestones of Object.values(groupedByTrack)) {
    const sorted = [...milestones].sort(sortByMilestone);
    const nextPending = sorted.find((item) => !item.isAchieved) ?? null;

    if (nextPending && nextPending.progress > 0) {
      keys.add(nextPending.key);
    }
  }

  return keys;
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

export default function AchievementsClient({ achievements }: Props) {
  const [showAllMilestones, setShowAllMilestones] = useState(false);
  const inProgressMilestoneKeys = useMemo(() => getInProgressMilestoneKeys(achievements), [achievements]);

  const visibleAchievements = useMemo(() => {
    if (showAllMilestones) return achievements;
    return compactMilestones(achievements);
  }, [achievements, showAllMilestones]);

  const grouped = useMemo(() => groupAchievements(visibleAchievements), [visibleAchievements]);
  const orderedCategories = useMemo(
    () => Object.keys(grouped).sort((a, b) => {
      const left = CATEGORY_ORDER.indexOf(a);
      const right = CATEGORY_ORDER.indexOf(b);
      const leftIndex = left === -1 ? 999 : left;
      const rightIndex = right === -1 ? 999 : right;
      return leftIndex - rightIndex;
    }),
    [grouped]
  );

  return (
    <div className="space-y-4">
      <label className="inline-flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 select-none">
        <input
          type="checkbox"
          checked={showAllMilestones}
          onChange={(event) => setShowAllMilestones(event.target.checked)}
          className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
        />
        დეტალური ჩვენება
      </label>

      <div className="space-y-6">
        {orderedCategories.map((category) => (
          <section key={category} className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {CATEGORY_LABELS[category] ?? category}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {grouped[category].map((item) => (
                <article
                  key={item.key}
                  className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded-md overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 text-xs">
                      {item.imageUrl ? (
                        <Image src={item.imageUrl} alt={item.name} width={48} height={48} className="h-full w-full object-cover" />
                      ) : (
                        <span>სრთ</span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{item.name}</h3>
                        {item.isAchieved ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                            მიღწეულია
                          </span>
                        ) : inProgressMilestoneKeys.has(item.key) ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                            მიმდინარე
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                            სამომავლო
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                        {item.maxProgress !== 1 && <p>პროგრესი: {progressText(item)}</p>}
                        {item.isAchieved && item.achievedAt && (
                          <p className="text-right">{formatPhotoTakenDate(item.achievedAt)}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
