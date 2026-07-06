import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { markFeedEventSeen } from '@/lib/feedEvents';
import { logerror } from '@/lib/logger';

const ParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

type Context = {
  params: Promise<{ id: string }>;
};

// POST /api/v1/feed/events/:id/seen — record that the user viewed an event.
export async function POST(req: NextRequest, context: Context) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const params = await context.params;
    const parsed = ParamsSchema.safeParse({ id: params.id });
    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }

    await markFeedEventSeen(auth.user.userId, parsed.data.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    await logerror('POST /api/v1/feed/events/[id]/seen error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
