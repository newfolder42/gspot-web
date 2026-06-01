import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { markNotificationSeen, markNotificationUnseen } from '@/lib/notifications';
import { logerror } from '@/lib/logger';

const ParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const BodySchema = z.object({
  seen: z.boolean(),
});

type Context = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: NextRequest, context: Context) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const params = await context.params;
    const parsedParams = ParamsSchema.safeParse({ id: params.id });
    if (!parsedParams.success) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }

    const body = await req.json();
    const parsedBody = BodySchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }

    const notificationId = parsedParams.data.id;
    const { seen } = parsedBody.data;

    const ok = seen
      ? await markNotificationSeen(notificationId, auth.user.userId)
      : await markNotificationUnseen(notificationId, auth.user.userId);

    return NextResponse.json({ ok });
  } catch (err) {
    await logerror('PATCH /api/v1/notifications/[id] error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
