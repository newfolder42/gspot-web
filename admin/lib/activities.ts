import { query } from '@/lib/db';
import type { ActivityKind } from '@/lib/labels';

// "Activity" is what the main app itself counts as activity (streaks, the activity-ranked
// feed): publishing a post, a guess, a comment, an upvote or downvote, and a reward.

export const ACTIVITY_LIMIT = 200;

export type ActivityDetail = {
  status?: string;
  score?: number | null;
  distance?: number | null;
  body?: string;
  value?: number;
  rewardName?: string;
  onComment?: boolean;
};

export type ActivityRow = {
  kind: ActivityKind;
  at: Date;
  user_id: number;
  user_alias: string;
  post_id: number;
  post_title: string | null;
  detail: ActivityDetail;
};

export type ActivityFilter = {
  userId: number | null;
  /** YYYY-MM-DD Tbilisi days, both inclusive; null = unbounded */
  from: string | null;
  to: string | null;
};

export async function findUser(term: string): Promise<{ id: number; alias: string } | null> {
  const alias = term.trim().replace(/^'/, '');
  if (!alias) return null;
  const res = await query<{ id: number; alias: string }>(
    `select id::int as id, alias from users where lower(alias) = lower($1) or id::text = $1 limit 1`,
    [alias]
  );
  return res.rows[0] ?? null;
}

// Each source is cut to the newest ACTIVITY_LIMIT before the union, so a busy day on one
// table cannot pull the whole history through. The days ($2 to $4) are Tbilisi calendar days.
function window(alias: string, column = 'created_at'): string {
  return `($1::bigint is null or ${alias}.user_id = $1)
      and ($2::date is null or ${alias}.${column} >= ($2::date)::timestamp at time zone 'Asia/Tbilisi')
      and ($4::date is null or ${alias}.${column} < (($4::date) + 1)::timestamp at time zone 'Asia/Tbilisi')`;
}

export async function getActivities(filter: ActivityFilter): Promise<ActivityRow[]> {
  const res = await query<ActivityRow>(
    `select a.kind, a.at, a.user_id::int as user_id, u.alias as user_alias, a.post_id::int as post_id,
            pt.title as post_title, a.detail
     from (
       (select 'post' as kind, p.created_at as at, p.user_id, p.id as post_id,
               jsonb_build_object('status', p.status) as detail
          from posts p
         where ${window('p')}
         order by p.created_at desc limit $3)
       union all
       (select 'guess', g.created_at, g.user_id, g.post_id,
               jsonb_build_object('score', g.details->'score', 'distance', g.details->'distance')
          from post_guesses g
         where ${window('g')}
         order by g.created_at desc limit $3)
       union all
       (select 'comment', c.created_at, c.user_id, c.post_id,
               jsonb_build_object('body', left(c.body, 200))
          from post_comments c
         where c.type = 'comment' and c.deleted_at is null and ${window('c')}
         order by c.created_at desc limit $3)
       union all
       (select 'vote', v.created_at, v.user_id, v.post_id,
               jsonb_build_object('value', v.value, 'onComment', v.comment_id is not null)
          from post_votes v
         where v.deleted_at is null and ${window('v')}
         order by v.created_at desc limit $3)
       union all
       (select 'reward', r.created_at, r.user_id, r.post_id,
               jsonb_build_object('rewardName', coalesce(rw.name, r.reward_key), 'onComment', r.comment_id is not null)
          from post_rewards r
          left join rewards rw on rw.key = r.reward_key
         where r.deleted_at is null and ${window('r')}
         order by r.created_at desc limit $3)
     ) a
     join users u on u.id = a.user_id
     left join posts pt on pt.id = a.post_id
     order by a.at desc
     limit $3`,
    [filter.userId, filter.from, ACTIVITY_LIMIT, filter.to]
  );
  return res.rows;
}
