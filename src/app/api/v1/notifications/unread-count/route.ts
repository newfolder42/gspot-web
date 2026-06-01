import { NextRequest, NextResponse } from 'next/server';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { query } from '@/lib/db';
import { logerror } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const res = await query(
      `SELECT COUNT(*)::int AS count, MAX(id)::text AS latest_id
       FROM user_notifications
       WHERE user_id = $1 AND (seen IS NULL OR seen = 0)`,
      [auth.user.userId]
    );

    const row = res.rows[0];
    return NextResponse.json({
      count: row.count ?? 0,
      latestId: row.latest_id ?? null,
    });
  } catch (err) {
    await logerror('GET /api/v1/notifications/unread-count error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
