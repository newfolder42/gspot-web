import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { getHideAndSeekGameForUser, getHideAndSeekPlayersForUser } from '@/lib/hideAndSeek';
import { logerror } from '@/lib/logger';

const ParamsSchema = z.object({ postId: z.coerce.number().int().positive() });

type Context = { params: Promise<{ postId: string }> };

// GET /api/v1/hide-and-seek/:postId — the game and its scoreboard.
// The hidden coordinates come back only for the host, or once the game has ended.
export async function GET(req: NextRequest, context: Context) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const parsed = ParamsSchema.safeParse(await context.params);
    if (!parsed.success) return NextResponse.json({ error: 'INVALID_PARAMS' }, { status: 400 });

    const [game, players] = await Promise.all([
      getHideAndSeekGameForUser(auth.user.userId, parsed.data.postId),
      getHideAndSeekPlayersForUser(auth.user.userId, parsed.data.postId),
    ]);

    if (!game) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

    return NextResponse.json({ game, players });
  } catch (err) {
    await logerror('GET /api/v1/hide-and-seek/[postId] error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
