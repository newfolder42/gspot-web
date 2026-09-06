import { query } from '@/lib/db';
import { logerror } from './logger';

/**
 * How long a post stays out of a user's shuffle deck after they skip it, by how
 * many times they have skipped it: 3 days the first time, 14 the second, 90
 * from the third on. A skip is never permanent — "I don't recognise this today"
 * shouldn't burn the post forever, and a keen player would otherwise run their
 * own pool dry.
 */
const SKIP_COOLDOWN_DAYS = [3, 14, 90];

/** Maps post_guess_skips.skip_count to its cooldown in days. */
const cooldownDaysSql = `case ${SKIP_COOLDOWN_DAYS.slice(0, -1)
  .map((days, i) => `when gs.skip_count <= ${i + 1} then ${days}`)
  .join(' ')} else ${SKIP_COOLDOWN_DAYS[SKIP_COOLDOWN_DAYS.length - 1]} end`;

/**
 * "post `p` is still on skip cooldown for the user in `userParam`" — for the
 * shuffle pool's where clause, which joins posts as `p`.
 */
export function onSkipCooldownSql(userParam: string): string {
  return `exists (
    select 1 from post_guess_skips gs
    where gs.post_id = p.id and gs.user_id = ${userParam}
      and gs.skipped_at > now() - make_interval(days => ${cooldownDaysSql})
  )`;
}

/** Records skips. Skipping the same post again bumps its count and cooldown. */
export async function recordGuessSkips(userId: number, postIds: number[]): Promise<void> {
  const ids = [...new Set(postIds)];
  if (ids.length === 0) return;

  try {
    await query(
      `insert into post_guess_skips (user_id, post_id)
       select $1, unnest($2::bigint[])
       on conflict (user_id, post_id) do update
         set skip_count = post_guess_skips.skip_count + 1,
             skipped_at = now()`,
      [userId, ids]
    );
  } catch (err) {
    await logerror('recordGuessSkips error', [err]);
  }
}
