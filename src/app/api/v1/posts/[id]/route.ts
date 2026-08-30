import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { getPostDetail } from '@/lib/post-detail';
import { getPostComments } from '@/lib/comments';
import { getVoteSummary } from '@/lib/votes';
import { getRewardSummary } from '@/lib/rewards';
import { updatePostTitleForUser } from '@/lib/posts';
import { setPostTag } from '@/lib/tags';
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
    // Same loader the web detail page uses, so both get a post carrying its own
    // type-specific payload (a hide-and-seek post arrives with its game and players).
    const post = await getPostDetail(auth.user.userId, postId);

    if (!post) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    // Comments already carry their own vote/reward summaries (see getPostComments);
    // these two cover the post itself.
    const [commentsFlat, votes, rewards] = await Promise.all([
      getPostComments(postId, auth.user.userId),
      getVoteSummary(postId, null, auth.user.userId),
      getRewardSummary(postId, null, auth.user.userId),
    ]);

    return NextResponse.json({
      post,
      // kept at the top level for the app's existing PostDetailResponse shape;
      // it also rides along inside `post` on a gps-photo.
      alreadyGuessed: post.type === 'gps-photo' ? post.alreadyGuessed : false,
      comments: buildCommentTree(commentsFlat),
      votes,
      rewards,
    });
  } catch (err) {
    await logerror('GET /api/v1/posts/[id] error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}

const PatchBodySchema = z.object({
  title: z.string().trim().min(1).max(500).optional(),
  tagId: z.number().int().positive().nullable().optional(),
});

// PATCH /api/v1/posts/:id — edit a post's title and/or its zone tag (owner only).
// Mirrors the web PostActions edit modal, which saves both together.
export async function PATCH(req: NextRequest, context: Context) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const params = await context.params;
    const parsedParams = ParamsSchema.safeParse({ id: params.id });
    if (!parsedParams.success) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }
    const postId = parsedParams.data.id;

    const parsedBody = PatchBodySchema.safeParse(await req.json());
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }
    const { title, tagId } = parsedBody.data;
    if (title === undefined && tagId === undefined) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }

    // Ownership is checked here rather than relying on the update predicate,
    // because setPostTag has no owner check of its own.
    const postRow = await query(
      `select p.user_id, p.zone_id from posts p where p.id = $1 limit 1`,
      [postId]
    );
    if ((postRow.rowCount ?? 0) === 0) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    if (Number(postRow.rows[0].user_id) !== auth.user.userId) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    // A tag may only come from the post's own zone.
    if (tagId != null) {
      const tagRow = await query(
        `select 1 from zone_tags where id = $1 and zone_id = $2 limit 1`,
        [tagId, postRow.rows[0].zone_id]
      );
      if ((tagRow.rowCount ?? 0) === 0) {
        return NextResponse.json({ error: 'INVALID_TAG' }, { status: 400 });
      }
    }

    if (title !== undefined) {
      const ok = await updatePostTitleForUser(auth.user.userId, postId, title);
      if (!ok) return NextResponse.json({ error: 'UPDATE_FAILED' }, { status: 400 });
    }
    if (tagId !== undefined) {
      const ok = await setPostTag(postId, tagId);
      if (!ok) return NextResponse.json({ error: 'UPDATE_FAILED' }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    await logerror('PATCH /api/v1/posts/[id] error', { error: String(err) });
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
