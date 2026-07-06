import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { getFeedEventGroup } from '@/lib/feedEvents';
import { logerror } from '@/lib/logger';

const QuerySchema = z.object({
  groupKey: z.string().min(1).max(150),
});

// GET /api/v1/feed/events/group?groupKey=quest:123 — the events inside one
// bubble (one per user), unseen first then newest.
export async function GET(req: NextRequest) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const parsed = QuerySchema.safeParse({
      groupKey: req.nextUrl.searchParams.get('groupKey') ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }

    const events = await getFeedEventGroup(auth.user.userId, parsed.data.groupKey);
    return NextResponse.json({ events });
  } catch (err) {
    await logerror('GET /api/v1/feed/events/group error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
