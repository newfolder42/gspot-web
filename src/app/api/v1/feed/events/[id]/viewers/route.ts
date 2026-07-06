import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { getFeedEventViewers } from '@/lib/feedEvents';
import { logerror } from '@/lib/logger';

const ParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

type Context = {
  params: Promise<{ id: string }>;
};

// GET /api/v1/feed/events/:id/viewers — followers who viewed your own event.
// Authorized: only returns rows when the event is authored by the caller.
export async function GET(req: NextRequest, context: Context) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const params = await context.params;
    const parsed = ParamsSchema.safeParse({ id: params.id });
    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }

    const viewers = await getFeedEventViewers(auth.user.userId, parsed.data.id);
    return NextResponse.json({ viewers });
  } catch (err) {
    await logerror('GET /api/v1/feed/events/[id]/viewers error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
