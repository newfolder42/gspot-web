import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { getNotificationsForUser } from '@/lib/notifications';
import { normalizeDetails, type NotificationType } from '@/types/notification';
import { logerror } from '@/lib/logger';

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const parsed = QuerySchema.safeParse({
      limit: req.nextUrl.searchParams.get('limit') ?? undefined,
      offset: req.nextUrl.searchParams.get('offset') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }

    const { limit, offset } = parsed.data;
    const rows = await getNotificationsForUser(auth.user.userId, limit, offset);

    const notifications: NotificationType[] = rows.map((row) => ({
      id: String(row.id),
      type: row.type as NotificationType['type'],
      user: {
        userId: row.userId,
        alias: row.userAlias || 'User',
      },
      details: normalizeDetails(row.details),
      timestamp: (row.createdAt ? row.createdAt : new Date()).toISOString(),
      seen: row.seen === 1,
    }));

    return NextResponse.json({ notifications });
  } catch (err) {
    await logerror('GET /api/v1/notifications error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
