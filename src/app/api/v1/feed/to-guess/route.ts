import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { getToGuessPosts } from '@/lib/posts';
import { logerror } from '@/lib/logger';

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(4),
  cursorDate: z.string().trim().min(1).optional(),
  cursorId: z.coerce.number().int().positive().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

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

    const posts = await getToGuessPosts(auth.user.userId, parsed.data.limit, cursor);

    return NextResponse.json({ posts });
  } catch (err) {
    await logerror('GET /api/v1/feed/to-guess error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
