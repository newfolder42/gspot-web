import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { getUserIdByAlias } from '@/lib/users';
import { getAccountPosts } from '@/lib/posts';
import { logerror } from '@/lib/logger';

type Context = { params: Promise<{ alias: string }> };

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(30).default(18),
  cursorDate: z.string().trim().min(1).optional(),
  cursorId: z.coerce.number().int().positive().optional(),
});

// GET /api/v1/users/[alias]/posts — cursor-paginated profile grid. The profile
// endpoint only carries the first page; this one is what "load more" hits.
export async function GET(req: NextRequest, context: Context) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const { alias } = await context.params;
    const userId = await getUserIdByAlias(alias);
    if (!userId) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

    const parsed = QuerySchema.safeParse({
      limit: req.nextUrl.searchParams.get('limit') ?? undefined,
      cursorDate: req.nextUrl.searchParams.get('cursorDate') ?? undefined,
      cursorId: req.nextUrl.searchParams.get('cursorId') ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }

    const cursor =
      parsed.data.cursorDate && parsed.data.cursorId
        ? { date: parsed.data.cursorDate, id: parsed.data.cursorId }
        : undefined;

    const posts = await getAccountPosts(Number(userId), auth.user.userId, parsed.data.limit, cursor);

    return NextResponse.json({ posts });
  } catch (err) {
    await logerror('GET /api/v1/users/[alias]/posts error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
