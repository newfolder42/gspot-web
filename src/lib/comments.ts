"use server";

import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { logerror } from '@/lib/logger';
import type { PostCommentType } from '@/types/post-comment';
import { eventBus } from '@/lib/eventBus';
import type { PostCommentCreatedEvent } from '@/types/events/post-comment-created';

export async function getPostComments(postId: number): Promise<PostCommentType[]> {
  try {
    const res = await query(
      `select c.id, c.post_id, c.user_id, c.parent_id, c.body, c.type, c.metadata, c.guess_id, c.created_at, c.deleted_at,
              u.alias as author_alias
       from post_comments c
       join users u on u.id = c.user_id
       where c.post_id = $1
       order by c.created_at desc, c.id desc`,
      [postId]
    );

    const flat: PostCommentType[] = res.rows.map(r => ({
      id: r.id,
      postId: r.post_id,
      userId: r.user_id,
      author: r.author_alias,
      parentId: r.parent_id ?? null,
      body: r.body,
      type: r.type,
      metadata: r.metadata ?? null,
      guessId: r.guess_id ?? null,
      createdAt: r.created_at,
      deletedAt: r.deleted_at ?? null,
      children: [],
    }));

    return buildCommentTree(flat);
  } catch (err) {
    await logerror('getPostComments error', [err]);
    return [];
  }
}

function buildCommentTree(flat: PostCommentType[]): PostCommentType[] {
  const map = new Map<number, PostCommentType>();
  const roots: PostCommentType[] = [];

  for (const c of flat) {
    map.set(c.id, { ...c, children: [] });
  }

  for (const c of flat) {
    const node = map.get(c.id)!;
    if (c.parentId === null) {
      roots.push(node);
    } else {
      const parent = map.get(c.parentId);
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }
  }

  return roots;
}

export async function createPostComment(
  postId: number,
  body: string,
  parentId?: number | null
): Promise<PostCommentType | null> {
  try {
    const user = await getCurrentUser();
    if (!user) return null;

    const trimmed = body.trim();
    if (!trimmed || trimmed.length > 2000) return null;

    const res = await query(
      `insert into post_comments (post_id, user_id, parent_id, body, type)
       values ($1, $2, $3, $4, 'comment')
       returning id, created_at`,
      [postId, user.userId, parentId ?? null, trimmed]
    );

    if ((res.rowCount ?? 0) === 0) return null;
    const r = res.rows[0];

    let parent: PostCommentCreatedEvent['parent'] = null;
    if (parentId !== null && parentId !== undefined) {
      const parentRes = await query(
        `select c.id as parent_id, c.user_id as commenter_id, u.alias as commenter_alias
         from post_comments c
         join users u on u.id = c.user_id
         where c.id = $1 and c.post_id = $2
         limit 1`,
        [parentId, postId]
      );

      if ((parentRes.rowCount ?? 0) > 0) {
        const parentRow = parentRes.rows[0];
        parent = {
          id: Number(parentRow.parent_id),
          commenterId: Number(parentRow.commenter_id),
          commenterAlias: parentRow.commenter_alias,
        };
      }
    }

    const postRes = await query(
      `select p.user_id as post_author_id, u.alias as post_author_alias, p.zone_id, z.slug as zone_slug
       from posts p
       join users u on u.id = p.user_id
       join zones z on z.id = p.zone_id
       where p.id = $1
       limit 1`,
      [postId]
    );

    if ((postRes.rowCount ?? 0) > 0) {
      const postRow = postRes.rows[0];
      await eventBus.publish('post', 'comment-created', {
        postId: +postId,
        commentId: r.id,
        parent,
        commentType: 'comment',
        commentBody: trimmed,
        postAuthorId: Number(postRow.post_author_id),
        postAuthorAlias: postRow.post_author_alias,
        commenterId: user.userId,
        commenterAlias: user.alias,
        zoneId: Number(postRow.zone_id),
        zoneSlug: postRow.zone_slug,
      } as PostCommentCreatedEvent);
    }

    return {
      id: r.id,
      postId,
      userId: user.userId,
      author: user.alias,
      parentId: parentId ?? null,
      body: trimmed,
      type: 'comment',
      metadata: null,
      guessId: null,
      createdAt: r.created_at,
      deletedAt: null,
      children: [],
    };
  } catch (err) {
    await logerror('createPostComment error', [err]);
    return null;
  }
}

export async function createGuessComment({
  postId,
  userId,
  guessId,
  score,
  distance,
  type = 'gps-guess-comment',
  imageUrl,
}: {
  postId: number;
  userId: number;
  guessId: number;
  score: number;
  distance: number;
  type?: 'gps-guess-comment' | 'gps-photo-guess-comment';
  imageUrl?: string;
}): Promise<void> {
  try {
    await query(
      `insert into post_comments (post_id, user_id, body, type, metadata, guess_id)
       values ($1, $2, '', $3, $4, $5)`,
      [
        postId,
        userId,
        type,
        JSON.stringify({ score, distance, ...(imageUrl ? { imageUrl } : {}) }),
        guessId,
      ]
    );
  } catch (err) {
    await logerror('createGuessComment error', [err]);
  }
}
