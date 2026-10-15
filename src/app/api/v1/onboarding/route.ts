import { NextRequest, NextResponse } from 'next/server';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { getOnboardingZones, isOnboardingCompleted } from '@/lib/onboarding';
import { logerror } from '@/lib/logger';

/**
 * Where the caller stands in the welcome flow, and what it needs to render.
 * `zones` is only filled while the flow is still pending: the public, open zones the
 * caller has not joined. Joining one goes through the ordinary
 * `POST /zones/[slug]/membership`.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const completed = await isOnboardingCompleted(auth.user.userId);
    const zones = completed ? [] : await getOnboardingZones(auth.user.userId);

    return NextResponse.json({ completed, zones });
  } catch (err) {
    await logerror('GET /api/v1/onboarding error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
