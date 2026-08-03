"use server";

import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { canUserAccessPost } from '@/lib/post-access';
import { logerror } from '@/lib/logger';
import { eventBus } from '@/lib/eventBus';
import type { VoteSummaryType, VoteValue } from '@/types/vote';
import type { PostVoteCreatedEvent } from '@/types/events/post-vote-created';

function targetCondition(commentId: number | null): string {
  return commentId === null ? 'v.comment_id is null' : 'v.comment_id = $2';
}

function targetParams(postId: number, commentId: number | null): (number | null)[] {
  return commentId === null ? [postId] : [postId, commentId];
}

async function getVoteScore(postId: number, commentId: number | null): Promise<number> {
  const res = await query(
    `select coalesce(sum(v.value), 0)::int as score
     from post_votes v
     where v.post_id = $1 and ${targetCondition(commentId)} and v.deleted_at is null`,
    targetParams(postId, commentId)
  );
  return Number(res.rows[0]?.score ?? 0);
}

async function getUserVote(postId: number, commentId: number | null, userId: number): Promise<VoteValue | null> {
  const params = [...targetParams(postId, commentId), userId];
  const res = await query(
    `select v.value
     from post_votes v
     where v.post_id = $1 and ${targetCondition(commentId)} and v.user_id = $${params.length} and v.deleted_at is null
     limit 1`,
    params
  );
  return res.rows[0]?.value ?? null;
}

export async function getVoteSummary(
  postId: number,
  commentId: number | null,
  userId?: number | null
): Promise<VoteSummaryType> {
  try {
    const [score, userVote] = await Promise.all([
      getVoteScore(postId, commentId),
      userId ? getUserVote(postId, commentId, userId) : Promise.resolve(null),
    ]);
    return { score, userVote };
  } catch (err) {
    await logerror('getVoteSummary error', [err]);
    return { score: 0, userVote: null };
  }
}

// Adds, switches or removes (soft delete) the current user's vote on a post or comment.
// Returns the fresh summary for the target, or null when the action is not allowed.
// Web entry point - the mobile API calls toggleVoteForUser directly.
export async function toggleVote(
  postId: number,
  commentId: number | null,
  value: VoteValue
): Promise<VoteSummaryType | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return toggleVoteForUser(user.userId, user.alias, postId, commentId, value);
}

// Same as toggleVote, by explicit user — shared by the web action and /api/v1.
export async function toggleVoteForUser(
  userId: number,
  alias: string,
  postId: number,
  commentId: number | null,
  value: VoteValue
): Promise<VoteSummaryType | null> {
  try {
    if (!(await canUserAccessPost(userId, postId))) return null;

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

    const existing = await getUserVote(postId, commentId, userId);

    if (existing === value) {
      // same vote again -> remove it (soft delete)
      await query(
        `update post_votes v set deleted_at = now()
         where v.post_id = $1 and ${targetCondition(commentId)} and v.user_id = $${commentId === null ? 2 : 3} and v.deleted_at is null`,
        [...targetParams(postId, commentId), userId]
      );
    } else {
      if (existing !== null) {
        await query(
          `update post_votes v set deleted_at = now()
           where v.post_id = $1 and ${targetCondition(commentId)} and v.user_id = $${commentId === null ? 2 : 3} and v.deleted_at is null`,
          [...targetParams(postId, commentId), userId]
        );
      }

      await query(
        `insert into post_votes (post_id, comment_id, user_id, value)
         values ($1, $2, $3, $4)`,
        [postId, commentId, userId, value]
      );

      await eventBus.publish('post', 'vote-created', {
        postId: +postId,
        commentId: commentId === null ? null : +commentId,
        value,
        voterId: userId,
        voterAlias: alias,
        postAuthorId: Number(target.post_author_id),
        postAuthorAlias: target.post_author_alias,
        commentAuthorId: target.comment_author_id !== null ? Number(target.comment_author_id) : null,
        commentAuthorAlias: target.comment_author_alias ?? null,
        zoneId: Number(target.zone_id),
        zoneSlug: target.zone_slug,
      } as PostVoteCreatedEvent);
    }

    return await getVoteSummary(postId, commentId, userId);
  } catch (err) {
    await logerror('toggleVoteForUser error', [err]);
    return null;
  }
}
