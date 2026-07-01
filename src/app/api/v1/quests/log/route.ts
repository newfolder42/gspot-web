import { NextRequest, NextResponse } from 'next/server';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { getUserQuestLog } from '@/lib/quests';
import { logerror } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const entries = await getUserQuestLog(auth.user.userId);
    return NextResponse.json({ entries });
  } catch (err) {
    await logerror('GET /api/v1/quests/log error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
