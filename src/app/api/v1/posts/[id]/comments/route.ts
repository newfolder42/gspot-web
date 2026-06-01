import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { query } from '@/lib/db';
import { eventBus } from '@/lib/eventBus';
import { logerror } from '@/lib/logger';
import type { PostCommentType } from '@/types/post-comment';
import type { PostCommentCreatedEvent } from '@/types/events/post-comment-created';

const ParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const BodySchema = z.object({
  body: z.string().trim().min(1).max(2000),
  parentId: z.number().int().positive().nullable().optional(),
});

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, context: Context) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;
    const { user } = auth;

    const rawParams = await context.params;
    const parsedParams = ParamsSchema.safeParse({ id: rawParams.id });
    if (!parsedParams.success) {
      return NextResponse.json({ error: 'INVALID_INPUT', detail: 'bad post id' }, { status: 400 });
    }
    const postId = parsedParams.data.id;

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ error: 'INVALID_INPUT', detail: 'malformed json' }, { status: 400 });
    }

    const parsedBody = BodySchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', detail: parsedBody.error.format() },
        { status: 400 }
      );
    }
    const { body: commentBody, parentId = null } = parsedBody.data;

    // Verify post exists
    const postCheck = await query(
      `select p.id, p.user_id as post_author_id, u.alias as post_author_alias, p.zone_id, z.slug as zone_slug
       from posts p
       join users u on u.id = p.user_id
       join zones z on z.id = p.zone_id
       where p.id = $1
       limit 1`,
      [postId]
    );
    if ((postCheck.rowCount ?? 0) === 0) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    const postRow = postCheck.rows[0];

    // If replying, verify parent comment belongs to the same post
    let parent: PostCommentCreatedEvent['parent'] = null;
    if (parentId) {
      const parentCheck = await query(
        `select c.id as parent_id, c.user_id as commenter_id, u.alias as commenter_alias
         from post_comments c
         join users u on u.id = c.user_id
         where c.id = $1 and c.post_id = $2
         limit 1`,
        [parentId, postId]
      );
      if ((parentCheck.rowCount ?? 0) === 0) {
        return NextResponse.json(
          { error: 'INVALID_INPUT', detail: 'parent comment not found in this post' },
          { status: 400 }
        );
      }
      const pr = parentCheck.rows[0];
      parent = {
        id: Number(pr.parent_id),
        commenterId: Number(pr.commenter_id),
        commenterAlias: pr.commenter_alias,
      };
    }

    // Insert comment
    const insert = await query(
      `insert into post_comments (post_id, user_id, parent_id, body, type)
       values ($1, $2, $3, $4, 'comment')
       returning id, created_at`,
      [postId, user.userId, parentId ?? null, commentBody.trim()]
    );
    if ((insert.rowCount ?? 0) === 0) {
      await logerror('POST /api/v1/posts/[id]/comments: insert returned 0 rows', { postId, userId: user.userId });
      return NextResponse.json({ error: 'CREATE_COMMENT_FAILED' }, { status: 500 });
    }
    const inserted = insert.rows[0];

    // Publish event (non-blocking)
    eventBus.publish('post', 'comment-created', {
      postId,
      commentId: inserted.id,
      parent,
      commentType: 'comment',
      commentBody: commentBody.trim(),
      postAuthorId: Number(postRow.post_author_id),
      postAuthorAlias: postRow.post_author_alias,
      commenterId: user.userId,
      commenterAlias: user.alias,
      zoneId: Number(postRow.zone_id),
      zoneSlug: postRow.zone_slug,
    } as PostCommentCreatedEvent).catch(() => {});

    const comment: PostCommentType = {
      id: inserted.id,
      postId,
      userId: user.userId,
      author: user.alias,
      parentId: parentId ?? null,
      body: commentBody.trim(),
      type: 'comment',
      metadata: null,
      guessId: null,
      createdAt: inserted.created_at,
      deletedAt: null,
      children: [],
      authorLevel: null,
    };

    return NextResponse.json({ comment });
  } catch (err) {
    await logerror('POST /api/v1/posts/[id]/comments unhandled error', {
      error: String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return NextResponse.json({ error: 'SERVER_ERROR', detail: String(err) }, { status: 500 });
  }
}
