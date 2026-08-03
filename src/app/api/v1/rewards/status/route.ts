import { NextRequest, NextResponse } from 'next/server';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { getRewardGivingStatus } from '@/lib/rewards';
import { logerror } from '@/lib/logger';

// GET /api/v1/rewards/status — the reward catalog plus this user's unlock state
// and remaining daily quota. Fetched when the "give a reward" sheet opens, not
// on page load (matches the web dialog).
export async function GET(req: NextRequest) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const status = await getRewardGivingStatus(auth.user.userId);
    return NextResponse.json(status);
  } catch (err) {
    await logerror('GET /api/v1/rewards/status error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
