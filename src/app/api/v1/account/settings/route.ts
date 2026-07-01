import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { getNotificationSettings, setEmailNotifications } from '@/lib/settings';
import { logerror } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const settings = await getNotificationSettings(auth.user.userId);
    if (!settings) {
      return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
    }

    return NextResponse.json(settings);
  } catch (err) {
    await logerror('GET /api/v1/account/settings error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}

const PatchSchema = z.object({
  emailNotificationsEnabled: z.boolean(),
});

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const body = await req.json().catch(() => ({}));
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }

    const ok = await setEmailNotifications(auth.user.userId, parsed.data.emailNotificationsEnabled);
    if (!ok) {
      return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
    }

    return NextResponse.json({ emailNotificationsEnabled: parsed.data.emailNotificationsEnabled });
  } catch (err) {
    await logerror('PATCH /api/v1/account/settings error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
