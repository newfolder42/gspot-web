import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { getPostBookmarks } from '@/lib/bookmarks';
import { POST_BOOKMARKS_PAGE_SIZE } from '@/types/bookmark';
import { logerror } from '@/lib/logger';

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(POST_BOOKMARKS_PAGE_SIZE),
  cursorId: z.coerce.number().int().positive().optional(),
});

// GET /api/v1/bookmarks/posts — the caller's saved posts, newest save first. Page with
// `cursorId` = the `id` of the last bookmark of the previous page. The route is namespaced by
// target so another kind of bookmark can sit beside it (/bookmarks/<target>).
export async function GET(req: NextRequest) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const parsed = QuerySchema.safeParse({
      limit: req.nextUrl.searchParams.get('limit') ?? undefined,
      cursorId: req.nextUrl.searchParams.get('cursorId') ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }

    const bookmarks = await getPostBookmarks(auth.user.userId, parsed.data.limit, parsed.data.cursorId);

    return NextResponse.json({ bookmarks });
  } catch (err) {
    await logerror('GET /api/v1/bookmarks/posts error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
