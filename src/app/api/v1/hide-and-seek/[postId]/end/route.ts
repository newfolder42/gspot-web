import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { endHideAndSeekGameForUser } from '@/lib/hideAndSeek';
import { logerror } from '@/lib/logger';

const ParamsSchema = z.object({ postId: z.coerce.number().int().positive() });

type Context = { params: Promise<{ postId: string }> };

// POST /api/v1/hide-and-seek/:postId/end — host stops the game early.
export async function POST(req: NextRequest, context: Context) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const parsed = ParamsSchema.safeParse(await context.params);
    if (!parsed.success) return NextResponse.json({ error: 'INVALID_PARAMS' }, { status: 400 });

    const result = await endHideAndSeekGameForUser(auth.user.userId, parsed.data.postId);
    if (!result.ok) return NextResponse.json({ error: result.reason.toUpperCase() }, { status: 400 });

    return NextResponse.json(result.data);
  } catch (err) {
    await logerror('POST /api/v1/hide-and-seek/[postId]/end error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
