import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { reviewPostLocation } from '@/lib/postLocationDisputes';
import { LOCATION_ERROR_STATUS } from '@/app/api/v1/_utils/location';
import { LOCATION_NOTE_MAX } from '@/types/post-location';
import { logerror } from '@/lib/logger';

const ParamsSchema = z.object({ id: z.coerce.number().int().positive() });
const BodySchema = z.object({
  action: z.enum(['suspend', 'dismiss', 'discard', 'restore']),
  // what the admin tells the author when suspending; ignored for the other actions
  note: z.string().trim().max(LOCATION_NOTE_MAX).optional(),
});

type Context = { params: Promise<{ id: string }> };

// POST /api/v1/posts/:id/location-review — zone owners/admins decide on a disputed post:
//   suspend  hide it and ask the author to correct the location (with an optional note to them)
//   dismiss  the location is fine; close the disputes
//   discard  (suspended post) close it for good — it stays suspended, its guesses are void
//   restore  (suspended post) lift the suspension as it is
export async function POST(req: NextRequest, context: Context) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const parsedParams = ParamsSchema.safeParse(await context.params);
    const parsedBody = BodySchema.safeParse(await req.json().catch(() => null));
    if (!parsedParams.success || !parsedBody.success) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }

    const result = await reviewPostLocation(
      auth.user.userId,
      auth.user.alias,
      parsedParams.data.id,
      parsedBody.data.action,
      { note: parsedBody.data.note }
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: LOCATION_ERROR_STATUS[result.error] });
    }

    return NextResponse.json({ ok: true, state: result.state });
  } catch (err) {
    await logerror('POST /api/v1/posts/[id]/location-review error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
