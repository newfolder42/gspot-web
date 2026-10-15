import { NextRequest, NextResponse } from 'next/server';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { completeOnboarding } from '@/lib/onboarding';
import { logerror } from '@/lib/logger';

/** Marks the welcome flow finished for the caller. Safe to repeat. */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const ok = await completeOnboarding(auth.user.userId);
    if (!ok) {
      return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
    }

    return NextResponse.json({ completed: true });
  } catch (err) {
    await logerror('POST /api/v1/onboarding/complete error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
