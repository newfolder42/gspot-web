import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { addPostBookmark, removePostBookmark } from '@/lib/bookmarks';
import { logerror } from '@/lib/logger';

const ParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

type Context = {
  params: Promise<{ id: string }>;
};

// PUT /api/v1/posts/:id/bookmark — save the post to the caller's ჩამახსოვრებულები.
// Idempotent: saving a saved post is a 200 like any other.
export async function PUT(req: NextRequest, context: Context) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const parsed = ParamsSchema.safeParse(await context.params);
    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }

    const result = await addPostBookmark(auth.user.userId, parsed.data.id);
    if (result === 'not_found') {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    if (result === 'error') {
      return NextResponse.json({ error: 'BOOKMARK_FAILED' }, { status: 500 });
    }

    return NextResponse.json({ bookmarked: true });
  } catch (err) {
    await logerror('PUT /api/v1/posts/[id]/bookmark error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}

// DELETE /api/v1/posts/:id/bookmark — take the post off the list. Idempotent as well, and
// allowed for a post the caller can no longer open.
export async function DELETE(req: NextRequest, context: Context) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const parsed = ParamsSchema.safeParse(await context.params);
    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }

    if (!(await removePostBookmark(auth.user.userId, parsed.data.id))) {
      return NextResponse.json({ error: 'BOOKMARK_FAILED' }, { status: 500 });
    }

    return NextResponse.json({ bookmarked: false });
  } catch (err) {
    await logerror('DELETE /api/v1/posts/[id]/bookmark error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
