import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { getPostForView, postIsGuessedByUser } from '@/lib/posts';
import { getPostComments } from '@/lib/comments';
import { query } from '@/lib/db';
import { eventBus } from '@/lib/eventBus';
import type { PostCommentType } from '@/types/post-comment';
import type { PostDeletedEvent } from '@/types/events/post-deleted';
import { logerror } from '@/lib/logger';

const ParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

type Context = {
  params: Promise<{ id: string }>;
};

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

export async function GET(req: NextRequest, context: Context) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const params = await context.params;
    const parsed = ParamsSchema.safeParse({ id: params.id });
    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }

    const postId = parsed.data.id;
    const post = await getPostForView(auth.user.userId, postId);

    if (!post) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    const [alreadyGuessed, commentsFlat] = await Promise.all([
      postIsGuessedByUser(postId, auth.user.userId),
      getPostComments(postId),
    ]);

    return NextResponse.json({
      post,
      alreadyGuessed,
      comments: buildCommentTree(commentsFlat),
    });
  } catch (err) {
    await logerror('GET /api/v1/posts/[id] error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: Context) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const params = await context.params;
    const parsed = ParamsSchema.safeParse({ id: params.id });
    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }
    const postId = parsed.data.id;

    // Verify ownership
    const postRow = await query(
      `select p.id, p.user_id, p.type, z.id as zone_id, z.slug as zone_slug
       from posts p join zones z on z.id = p.zone_id
       where p.id = $1 limit 1`,
      [postId]
    );
    if ((postRow.rowCount ?? 0) === 0) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    const post = postRow.rows[0];
    if (Number(post.user_id) !== auth.user.userId) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    await query(`delete from posts where id = $1`, [postId]);

    eventBus.publish('post', 'deleted', {
      postId,
      postType: post.type,
      authorId: auth.user.userId,
      authorAlias: auth.user.alias,
      zoneId: Number(post.zone_id),
      zoneSlug: post.zone_slug,
    } as PostDeletedEvent).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    await logerror('DELETE /api/v1/posts/[id] error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
