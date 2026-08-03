import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { getNewUsers, getTotalUsers } from '@/lib/users';
import { logerror } from '@/lib/logger';

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// GET /api/v1/users — most recently registered users, newest first, plus the
// site-wide total (the web /new-users page shows both).
export async function GET(req: NextRequest) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const parsed = QuerySchema.safeParse({
      limit: req.nextUrl.searchParams.get('limit') ?? undefined,
      offset: req.nextUrl.searchParams.get('offset') ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }

    const [users, total] = await Promise.all([
      getNewUsers(parsed.data.limit, parsed.data.offset),
      // Only worth a round trip on the first page — later pages reuse the header count.
      parsed.data.offset === 0 ? getTotalUsers() : Promise.resolve(null),
    ]);

    return NextResponse.json({ users, total });
  } catch (err) {
    await logerror('GET /api/v1/users error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
