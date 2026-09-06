import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { getShufflePosts } from '@/lib/posts';
import { logerror } from '@/lib/logger';

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(10),
  /** Ids already dealt this session, so the next deck doesn't repeat them. */
  exclude: z
    .string()
    .trim()
    .optional()
    .transform((v) =>
      (v ?? '')
        .split(',')
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0)
        .slice(0, 200)
    ),
});

// GET /api/v1/feed/shuffle — the next shuffled deck of posts to guess.
export async function GET(req: NextRequest) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const parsed = QuerySchema.safeParse({
      limit: req.nextUrl.searchParams.get('limit') ?? undefined,
      exclude: req.nextUrl.searchParams.get('exclude') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }

    const posts = await getShufflePosts(auth.user.userId, parsed.data.limit, parsed.data.exclude);

    return NextResponse.json({ posts });
  } catch (err) {
    await logerror('GET /api/v1/feed/shuffle error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
