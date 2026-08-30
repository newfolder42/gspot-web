"use server";

import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { canUserAccessPost } from '@/lib/post-access';
import { logerror } from '@/lib/logger';
import { eventBus } from '@/lib/eventBus';
import {
  DEFAULT_DAILY_REWARD_LIMIT,
  isHideAndSeekReward,
  rewardTargetForCommentType,
  rewardTargetKindForCommentType,
} from '@/types/reward';
import type { RewardCountType, RewardDefinition, RewardGivingStatusType, RewardSummaryType, RewardUserType } from '@/types/reward';
import type { PostRewardCreatedEvent } from '@/types/events/post-reward-created';

function mapRewardRow(r: any): RewardDefinition {
  return {
    key: r.key,
    name: r.name,
    appliesTo: r.applies_to,
    unlockable: r.unlockable,
    iconUrl: r.icon_url,
    status: r.status,
  };
}

// All reward definitions, including disabled ones — only needed by the "give a reward"
// dialog (see getRewardGivingStatus), never on page load.
async function getRewardDefinitions(): Promise<RewardDefinition[]> {
  try {
    const res = await query(
      `select key, name, applies_to, unlockable, icon_url, status
       from rewards
       order by sort_order, key`
    );
    return res.rows.map(mapRewardRow);
  } catch (err) {
    await logerror('getRewardDefinitions error', [err]);
    return [];
  }
}

export async function getRewardDefinitionsByKeys(keys: string[]): Promise<RewardDefinition[]> {
  if (keys.length === 0) return [];
  try {
    const res = await query(
      `select key, name, applies_to, unlockable, icon_url, status
       from rewards
       where key = any($1::varchar[])
       order by sort_order, key`,
      [keys]
    );
    return res.rows.map(mapRewardRow);
  } catch (err) {
    await logerror('getRewardDefinitionsByKeys error', [err]);
    return [];
  }
}

async function getRewardDefinitionByKey(key: string): Promise<RewardDefinition | null> {
  const res = await query(
    `select key, name, applies_to, unlockable, icon_url, status from rewards where key = $1 limit 1`,
    [key]
  );
  return (res.rowCount ?? 0) > 0 ? mapRewardRow(res.rows[0]) : null;
}

// Reward keys the user has unlocked through achievements/quests.
export async function getUnlockedRewardKeys(userId: number): Promise<string[]> {
  try {
    const res = await query(
      `select reward_key from user_unlocked_rewards where user_id = $1`,
      [userId]
    );
    return res.rows.map((r) => r.reward_key as string);
  } catch (err) {
    await logerror('getUnlockedRewardKeys error', [err]);
    return [];
  }
}

// Grants a reward unlock to a user (e.g. from an achievement/quest completion handler).
// Idempotent — unlocking the same reward twice is a no-op.
export async function grantRewardUnlock(userId: number, rewardKey: string): Promise<void> {
  try {
    await query(
      `insert into user_unlocked_rewards (user_id, reward_key) values ($1, $2)
       on conflict (user_id, reward_key) do nothing`,
      [userId, rewardKey]
    );
  } catch (err) {
    await logerror('grantRewardUnlock error', [err]);
  }
}

// This user's effective daily reward-giving quota: their personal override from
// user_reward_limits, or DEFAULT_DAILY_REWARD_LIMIT when they have no row.
export async function getUserDailyRewardLimit(userId: number): Promise<number> {
  try {
    const res = await query(
      `select daily_limit from user_reward_limits where user_id = $1 limit 1`,
      [userId]
    );
    return res.rows[0]?.daily_limit != null ? Number(res.rows[0].daily_limit) : DEFAULT_DAILY_REWARD_LIMIT;
  } catch (err) {
    await logerror('getUserDailyRewardLimit error', [err]);
    return DEFAULT_DAILY_REWARD_LIMIT;
  }
}

// Raises a user's personal daily reward limit (e.g. from a quest/level-up reward handler).
// Only ever increases it — never lowers a limit the user already has.
export async function setUserDailyRewardLimit(userId: number, dailyLimit: number): Promise<void> {
  try {
    await query(
      `insert into user_reward_limits (user_id, daily_limit) values ($1, $2)
       on conflict (user_id) do update
         set daily_limit = greatest(user_reward_limits.daily_limit, excluded.daily_limit),
             updated_at = now()`,
      [userId, dailyLimit]
    );
  } catch (err) {
    await logerror('setUserDailyRewardLimit error', [err]);
  }
}

export async function increaseUserDailyRewardLimit(userId: number, increase: number): Promise<void> {
  try {
    await query(
      `insert into user_reward_limits (user_id, daily_limit) values ($1, $2)
       on conflict (user_id) do update
         set daily_limit = user_reward_limits.daily_limit + $3,
             updated_at = now()`,
      [userId, DEFAULT_DAILY_REWARD_LIMIT + increase, increase]
    );
  } catch (err) {
    await logerror('increaseUserDailyRewardLimit error', [err]);
  }
}

async function getRewardsGivenTodayCount(userId: number): Promise<number> {
  const res = await query(
    // ცხელა/თბილა/ცივა are game flavour, not a compliment: a host would burn the whole
    // daily quota within one game if these counted. Derived from the catalog rather than
    // stored per row, so any future game-only reward is covered without a schema change.
    `select count(*)::int as cnt from post_rewards r
      where r.user_id = $1 and r.deleted_at is null and r.created_at >= date_trunc('day', now())
        and not exists (
          select 1 from rewards rw
           where rw.key = r.reward_key and 'hide-and-seek-check' = any(rw.applies_to)
        )`,
    [userId]
  );
  return Number(res.rows[0]?.cnt ?? 0);
}

// Fetched when the "give a reward" dialog opens (not on page load) — the catalog, the
// user's unlock state and their daily quota are all cheap per-open lookups that most page
// views never need.
export async function getRewardGivingStatus(userId: number): Promise<RewardGivingStatusType> {
  try {
    const [definitions, unlockedKeys, givenToday, dailyLimit] = await Promise.all([
      getRewardDefinitions(),
      getUnlockedRewardKeys(userId),
      getRewardsGivenTodayCount(userId),
      getUserDailyRewardLimit(userId),
    ]);
    return { definitions, unlockedKeys, dailyLimit, remainingToday: Math.max(0, dailyLimit - givenToday) };
  } catch (err) {
    await logerror('getRewardGivingStatus error', [err]);
    return { definitions: [], unlockedKeys: [], dailyLimit: DEFAULT_DAILY_REWARD_LIMIT, remainingToday: 0 };
  }
}

function targetCondition(commentId: number | null): string {
  return commentId === null ? 'r.comment_id is null' : 'r.comment_id = $2';
}

function targetParams(postId: number, commentId: number | null): (number | null)[] {
  return commentId === null ? [postId] : [postId, commentId];
}

async function getRewardCounts(postId: number, commentId: number | null): Promise<RewardCountType[]> {
  const res = await query(
    `select r.reward_key, count(*)::int as cnt, rw.name, rw.icon_url
     from post_rewards r
     join rewards rw on rw.key = r.reward_key
     where r.post_id = $1 and ${targetCondition(commentId)} and r.deleted_at is null
     group by r.reward_key, rw.name, rw.icon_url
     order by cnt desc, r.reward_key`,
    targetParams(postId, commentId)
  );
  return res.rows.map((r) => ({ key: r.reward_key, count: Number(r.cnt), name: r.name, iconUrl: r.icon_url }));
}

async function getUserReward(postId: number, commentId: number | null, userId: number): Promise<string | null> {
  const params = [...targetParams(postId, commentId), userId];
  const res = await query(
    `select r.reward_key
     from post_rewards r
     where r.post_id = $1 and ${targetCondition(commentId)} and r.user_id = $${params.length} and r.deleted_at is null
     limit 1`,
    params
  );
  return res.rows[0]?.reward_key ?? null;
}

export async function getRewardSummary(
  postId: number,
  commentId: number | null,
  userId?: number | null
): Promise<RewardSummaryType> {
  try {
    const [rewards, userReward] = await Promise.all([
      getRewardCounts(postId, commentId),
      userId ? getUserReward(postId, commentId, userId) : Promise.resolve(null),
    ]);
    return { rewards, userReward };
  } catch (err) {
    await logerror('getRewardSummary error', [err]);
    return { rewards: [], userReward: null };
  }
}

export async function getRewardUsers(postId: number, commentId: number | null): Promise<RewardUserType[]> {
  try {
    const res = await query(
      `select r.reward_key, r.user_id, r.created_at, u.alias, ux.level, rw.name, rw.icon_url
       from post_rewards r
       join users u on u.id = r.user_id
       left join user_xp ux on ux.user_id = u.id
       join rewards rw on rw.key = r.reward_key
       where r.post_id = $1 and ${targetCondition(commentId)} and r.deleted_at is null
       order by r.created_at desc, r.id desc`,
      targetParams(postId, commentId)
    );
    return res.rows.map((r) => ({
      key: r.reward_key,
      userId: Number(r.user_id),
      alias: r.alias,
      level: r.level ?? null,
      createdAt: r.created_at,
      name: r.name,
      iconUrl: r.icon_url,
    }));
  } catch (err) {
    await logerror('getRewardUsers error', [err]);
    return [];
  }
}

// Rewards on comments are limited to guesses (a compliment for a good guess) and
// hide-and-seek checks — plain comments only get votes. Returns the comment type, which
// also decides which catalog applies and how the notification reads.
const REWARDABLE_COMMENT_TYPES = ['gps-guess-comment', 'gps-photo-guess-comment', 'hide-and-seek-check-comment'];

async function getRewardableCommentType(commentId: number): Promise<string | null> {
  const res = await query(
    `select type from post_comments where id = $1 and deleted_at is null limit 1`,
    [commentId]
  );
  const type = res.rows[0]?.type;
  return REWARDABLE_COMMENT_TYPES.includes(type) ? type : null;
}

// ცხელა / თბილა / ცივა may only be given by the host of that game — everyone else
// still gets the ordinary comment rewards on a check.
async function isHideAndSeekHost(userId: number, postId: number): Promise<boolean> {
  const res = await query(
    `select 1 from hide_and_seek_games where post_id = $1 and user_id = $2 limit 1`,
    [postId, userId]
  );
  return (res.rowCount ?? 0) > 0;
}

// Gives the current user's reward on a post or comment. One-shot: once given, a reward
// can never be removed or switched — there is no undo, by design (keeps rewards meaningful
// and makes the daily quota easy to reason about).
// Returns the fresh summary for the target, or null when the action is not allowed.
// Web entry point — the mobile API calls giveRewardForUser directly.
export async function giveReward(
  postId: number,
  commentId: number | null,
  rewardKey: string
): Promise<RewardSummaryType | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return giveRewardForUser(user.userId, user.alias, postId, commentId, rewardKey);
}

// Same as giveReward, by explicit user — shared by the web action and /api/v1.
export async function giveRewardForUser(
  userId: number,
  alias: string,
  postId: number,
  commentId: number | null,
  rewardKey: string
): Promise<RewardSummaryType | null> {
  try {
    const def = await getRewardDefinitionByKey(rewardKey);
    if (!def) return null;
    if (def.status !== 'active') return null;

    let commentType: string | null = null;
    if (commentId !== null) {
      commentType = await getRewardableCommentType(commentId);
      if (commentType === null) return null;
    }

    const rewardTarget = commentId === null ? 'post' : rewardTargetForCommentType(commentType!);
    const targetKind = rewardTargetKindForCommentType(commentType);
    if (!def.appliesTo.includes(rewardTarget)) return null;

    if (def.unlockable) {
      const unlocked = await getUnlockedRewardKeys(userId);
      if (!unlocked.includes(def.key)) return null;
    }

    if (!(await canUserAccessPost(userId, postId))) return null;

    const isGameReward = isHideAndSeekReward(rewardKey);
    if (isGameReward && !(await isHideAndSeekHost(userId, postId))) return null;

    const existing = await getUserReward(postId, commentId, userId);
    if (existing !== null) return null; // already gave a reward here — no undo, no switching

    if (!isGameReward) {
      const [givenToday, dailyLimit] = await Promise.all([
        getRewardsGivenTodayCount(userId),
        getUserDailyRewardLimit(userId),
      ]);
      if (givenToday >= dailyLimit) return null;
    }

    // resolve target + event payload data in one shot; also validates the comment belongs to the post
    const targetRes = await query(
      commentId === null
        ? `select p.user_id as post_author_id, u.alias as post_author_alias,
                  null::integer as comment_author_id, null::text as comment_author_alias,
                  p.zone_id, z.slug as zone_slug
           from posts p
           join users u on u.id = p.user_id
           join zones z on z.id = p.zone_id
           where p.id = $1
           limit 1`
        : `select p.user_id as post_author_id, u.alias as post_author_alias,
                  c.user_id as comment_author_id, cu.alias as comment_author_alias,
                  p.zone_id, z.slug as zone_slug
           from posts p
           join users u on u.id = p.user_id
           join zones z on z.id = p.zone_id
           join post_comments c on c.id = $2 and c.post_id = p.id and c.deleted_at is null
           join users cu on cu.id = c.user_id
           where p.id = $1
           limit 1`,
      targetParams(postId, commentId)
    );
    if ((targetRes.rowCount ?? 0) === 0) return null;
    const target = targetRes.rows[0];

    await query(
      `insert into post_rewards (post_id, comment_id, user_id, reward_key)
       values ($1, $2, $3, $4)`,
      [postId, commentId, userId, rewardKey]
    );

    await eventBus.publish('post', 'reward-created', {
      postId: +postId,
      commentId: commentId === null ? null : +commentId,
      targetType: targetKind,
      rewardKey,
      rewardName: def.name,
      giverId: userId,
      giverAlias: alias,
      postAuthorId: Number(target.post_author_id),
      postAuthorAlias: target.post_author_alias,
      commentAuthorId: target.comment_author_id !== null ? Number(target.comment_author_id) : null,
      commentAuthorAlias: target.comment_author_alias ?? null,
      zoneId: Number(target.zone_id),
      zoneSlug: target.zone_slug,
    } as PostRewardCreatedEvent);

    return await getRewardSummary(postId, commentId, userId);
  } catch (err) {
    await logerror('giveRewardForUser error', [err]);
    return null;
  }
}
