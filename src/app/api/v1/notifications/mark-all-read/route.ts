import { NextRequest, NextResponse } from 'next/server';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { markAllNotificationsSeen } from '@/lib/notifications';
import { logerror } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const ok = await markAllNotificationsSeen(auth.user.userId);
    return NextResponse.json({ ok });
  } catch (err) {
    await logerror('POST /api/v1/notifications/mark-all-read error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
