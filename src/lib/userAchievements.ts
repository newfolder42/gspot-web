import { query } from '@/lib/db';
import { logerror } from '@/lib/logger';
import type { AccountAchievement } from '@/types/achievement';

type RawMilestoneRow = {
  track_id: string | number;
  track_key: string;
  category: string;
  milestone_id: string | number;
  milestone_key: string;
  milestone_name: string;
  target_value: string | number;
  sort_order: string | number;
  milestone_state: 'visible' | 'hidden';
  image_url: string | null;
  current_value: string | number | null;
  ua_status: 'locked' | 'in_progress' | 'achieved' | null;
  unlocked_at: string | null;
};

function sortMilestones(a: AccountAchievement, b: AccountAchievement) {
  if (a.maxProgress !== b.maxProgress) {
    return (a.maxProgress ?? Number.MAX_SAFE_INTEGER) - (b.maxProgress ?? Number.MAX_SAFE_INTEGER);
  }

  return a.achievementId - b.achievementId;
}

function categoryOrder(category: string) {
  const order: Record<string, number> = {
    base: 1,
    posts: 2,
    guesses: 3,
    streaks: 4,
    level: 5,
  };

  return order[category] ?? 99;
}

export async function getAccountAchievementsByAlias(userId: number): Promise<AccountAchievement[] | null> {
  try {
    const res = await query(
      `SELECT *
       FROM (
         SELECT
          a.id AS track_id,
          a.key AS track_key,
          a.category,
          am.id AS milestone_id,
          am.key AS milestone_key,
          am.name AS milestone_name,
          am.target_value,
          am.sort_order,
          am.state AS milestone_state,
          COALESCE(am.image_url, a.image_url) AS image_url,
          COALESCE(ua.current_value, 0) AS current_value,
          ua.status AS ua_status,
          uam.achieved_at AS unlocked_at
       FROM achievements a
       JOIN achievement_milestones am ON am.achievement_id = a.id
       LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = $1
       LEFT JOIN user_achievement_milestones uam ON uam.milestone_id = am.id AND uam.user_id = $1
       WHERE a.achievement_type = 'progressive'
         AND (
          am.state = 'visible'
          OR uam.id IS NOT NULL
          OR COALESCE(ua.current_value, 0) > 0
         )

         UNION ALL

         SELECT
          a.id AS track_id,
          a.key AS track_key,
          a.category,
          a.id AS milestone_id,
          a.key AS milestone_key,
          a.name AS milestone_name,
          1 AS target_value,
          0 AS sort_order,
          a.state AS milestone_state,
          a.image_url AS image_url,
          COALESCE(ua.current_value, 0) AS current_value,
          ua.status AS ua_status,
          ua.achieved_at AS unlocked_at
       FROM achievements a
       LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = $1
       WHERE a.achievement_type = 'one_time'
         AND (
          a.state = 'visible'
          OR ua.achieved_at IS NOT NULL
          OR COALESCE(ua.current_value, 0) > 0
         )
       ) achievements_union

       ORDER BY
         CASE category
           WHEN 'base' THEN 1
           WHEN 'posts' THEN 2
           WHEN 'guesses' THEN 3
           WHEN 'streaks' THEN 4
           WHEN 'level' THEN 5
           ELSE 99
         END,
         track_id,
         sort_order,
         target_value,
         milestone_id`,
      [userId]
    );

    const mapped: AccountAchievement[] = (res.rows as RawMilestoneRow[]).map((row) => {
      const progress = Number(row.current_value ?? 0);
      const maxProgress = Number(row.target_value);
      const achievedAt = row.unlocked_at ? new Date(row.unlocked_at).toISOString() : null;
      const isAchieved = row.ua_status === 'achieved' || Boolean(achievedAt) || progress >= maxProgress;

      return {
        achievementId: Number(row.milestone_id),
        trackId: Number(row.track_id),
        trackKey: row.track_key,
        key: row.milestone_key,
        name: row.milestone_name,
        category: row.category,
        maxProgress,
        state: row.milestone_state,
        imageUrl: row.image_url ?? null,
        progress,
        achievedAt,
        inProgress: row.ua_status === 'in_progress' || (progress > 0 && !isAchieved),
        isAchieved,
      };
    });

    return mapped.sort((a, b) => {
      const leftCategory = categoryOrder(a.category);
      const rightCategory = categoryOrder(b.category);
      if (leftCategory !== rightCategory) return leftCategory - rightCategory;

      if (a.trackId !== b.trackId) return a.trackId - b.trackId;

      return sortMilestones(a, b);
    });
  } catch (err) {
    await logerror('getAccountAchievementsByAlias error', [err]);
    return null;
  }
}
