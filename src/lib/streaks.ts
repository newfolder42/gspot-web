import { query } from '@/lib/db';
import { logerror } from '@/lib/logger';

export type UserStreakInfo = {
  current: number;
  longest: number;
  activeToday: boolean;
};

const EMPTY_STREAK: UserStreakInfo = { current: 0, longest: 0, activeToday: false };

export async function getUserStreakInfo(userId: number): Promise<UserStreakInfo> {
  try {
    const res = await query(
      `WITH today AS (
         SELECT now()::date AS day
       ),
       grouped AS (
         SELECT
           activity_date,
           activity_date - (ROW_NUMBER() OVER (ORDER BY activity_date))::int AS grp
         FROM user_streaks
         WHERE user_id = $1
       ),
       streaks AS (
         SELECT COUNT(*)::int AS streak_length, MAX(activity_date) AS last_day
         FROM grouped
         GROUP BY grp
       )
       SELECT
         COALESCE((SELECT MAX(streak_length) FROM streaks), 0)::int AS longest,
         COALESCE(
           (SELECT streak_length FROM streaks, today WHERE last_day >= today.day - 1),
           0
         )::int AS current,
         EXISTS (
           SELECT 1 FROM user_streaks, today
           WHERE user_id = $1 AND activity_date = today.day
         ) AS active_today`,
      [userId]
    );

    const row = res.rows[0];
    if (!row) return EMPTY_STREAK;

    return {
      current: Number(row.current ?? 0),
      longest: Number(row.longest ?? 0),
      activeToday: Boolean(row.active_today),
    };
  } catch (err) {
    await logerror('getUserStreakInfo error', [err]);
    return EMPTY_STREAK;
  }
}
