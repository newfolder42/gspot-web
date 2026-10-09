import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { fileLocationDispute } from '@/lib/postLocationDisputes';
import { LOCATION_ERROR_STATUS } from '@/app/api/v1/_utils/location';
import { LOCATION_DISPUTE_REASONS, LOCATION_NOTE_MAX } from '@/types/post-location';
import { logerror } from '@/lib/logger';

const ParamsSchema = z.object({ id: z.coerce.number().int().positive() });
const BodySchema = z.object({
  reason: z.enum(LOCATION_DISPUTE_REASONS).default('wrong_place'),
  note: z.string().trim().max(LOCATION_NOTE_MAX).optional(),
});

type Context = { params: Promise<{ id: string }> };

// POST /api/v1/posts/:id/location-dispute — a guesser contests the post's location
// ("გასაჩივრება") with a reason (and a note, required for "other"). Only a guess scored under
// 100 can be contested, once per guess. The first open dispute flags the post and notifies the
// zone's owners/admins and the author.
export async function POST(req: NextRequest, context: Context) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const parsed = ParamsSchema.safeParse(await context.params);
    // A body is optional: the original request shape (no body) still means "wrong place".
    const parsedBody = BodySchema.safeParse((await req.json().catch(() => null)) ?? {});
    if (!parsed.success || !parsedBody.success) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }

    const result = await fileLocationDispute(auth.user.userId, auth.user.alias, parsed.data.id, parsedBody.data);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: LOCATION_ERROR_STATUS[result.error] });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    await logerror('POST /api/v1/posts/[id]/location-dispute error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
