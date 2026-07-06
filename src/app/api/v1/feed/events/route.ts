import { NextRequest, NextResponse } from 'next/server';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { getFeedEventBubbles, getOwnFeedEvents } from '@/lib/feedEvents';
import { logerror } from '@/lib/logger';

// GET /api/v1/feed/events — the "ამბები" strip: preview bubbles (quests /
// achievements completed by people you follow) plus your own recent events.
export async function GET(req: NextRequest) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const [bubbles, own] = await Promise.all([
      getFeedEventBubbles(auth.user.userId),
      getOwnFeedEvents(auth.user.userId),
    ]);

    return NextResponse.json({ bubbles, own });
  } catch (err) {
    await logerror('GET /api/v1/feed/events error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
