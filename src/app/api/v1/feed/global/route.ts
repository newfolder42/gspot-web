import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { getGlobalPosts } from '@/lib/posts';
import { logerror } from '@/lib/logger';
import type { FeedFilter } from '@/types/post';

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(4),
  cursorDate: z.string().trim().min(1).optional(),
  cursorId: z.coerce.number().int().positive().optional(),
  filter: z.enum(['all', 'guessed', 'not-guessed']).default('all'),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const parsed = QuerySchema.safeParse({
      limit: req.nextUrl.searchParams.get('limit') ?? undefined,
      cursorDate: req.nextUrl.searchParams.get('cursorDate') ?? undefined,
      cursorId: req.nextUrl.searchParams.get('cursorId') ?? undefined,
      filter: req.nextUrl.searchParams.get('filter') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }

    const cursor =
      parsed.data.cursorDate && parsed.data.cursorId
        ? { date: parsed.data.cursorDate, id: parsed.data.cursorId }
        : undefined;

    const posts = await getGlobalPosts(
      auth.user.userId,
      parsed.data.limit,
      cursor,
      parsed.data.filter as FeedFilter
    );

    return NextResponse.json({ posts });
  } catch (err) {
    await logerror('GET /api/v1/feed/global error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
