import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { getHideAndSeekCheckMapForUser } from '@/lib/hideAndSeek';
import { logerror } from '@/lib/logger';

const ParamsSchema = z.object({ postId: z.coerce.number().int().positive() });

type Context = { params: Promise<{ postId: string }> };

// GET /api/v1/hide-and-seek/:postId/checks — every check placed in the game plus the
// hiding spot, for the host's post-game map. Host-only and finished games only:
// getHideAndSeekCheckMapForUser returns null for anyone or anything else.
export async function GET(req: NextRequest, context: Context) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const parsed = ParamsSchema.safeParse(await context.params);
    if (!parsed.success) return NextResponse.json({ error: 'INVALID_PARAMS' }, { status: 400 });

    const data = await getHideAndSeekCheckMapForUser(auth.user.userId, parsed.data.postId);
    if (!data) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

    return NextResponse.json(data);
  } catch (err) {
    await logerror('GET /api/v1/hide-and-seek/[postId]/checks error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
