import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { reactToFeedEvent } from '@/lib/feedEvents';
import { logerror } from '@/lib/logger';

const ParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

type Context = {
  params: Promise<{ id: string }>;
};

// POST /api/v1/feed/events/:id/react — one-time upvote on someone else's event.
// Idempotent: reacting again returns the same { ok: true, reacted: true }.
export async function POST(req: NextRequest, context: Context) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const params = await context.params;
    const parsed = ParamsSchema.safeParse({ id: params.id });
    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }

    const result = await reactToFeedEvent(auth.user.userId, auth.user.alias, parsed.data.id);
    if (!result.ok) return NextResponse.json({ error: 'NOT_ALLOWED' }, { status: 403 });

    return NextResponse.json(result);
  } catch (err) {
    await logerror('POST /api/v1/feed/events/[id]/react error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
