import { NextRequest, NextResponse } from 'next/server';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { getActiveHideAndSeekForUser } from '@/lib/hideAndSeek';
import { logerror } from '@/lib/logger';

// GET /api/v1/hide-and-seek/active — backs the floating ongoing-game button.
// Returns null when the user is not in a game.
export async function GET(req: NextRequest) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const active = await getActiveHideAndSeekForUser(auth.user.userId);
    return NextResponse.json({ game: active });
  } catch (err) {
    await logerror('GET /api/v1/hide-and-seek/active error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
