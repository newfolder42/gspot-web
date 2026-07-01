import { NextRequest, NextResponse } from 'next/server';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { getConnectionsForUserByAlias } from '@/lib/connections';
import { logerror } from '@/lib/logger';

type Context = { params: Promise<{ alias: string }> };

export async function GET(req: NextRequest, context: Context) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const { alias } = await context.params;
    const connections = await getConnectionsForUserByAlias(alias);

    return NextResponse.json({ connections });
  } catch (err) {
    await logerror('GET /api/v1/users/[alias]/connections error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
