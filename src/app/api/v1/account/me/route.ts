import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/mobile-jwt';
import { getOwnAccount } from '@/lib/account';
import { logerror } from '@/lib/logger';

function extractBearerToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7).trim();
  return token.length > 0 ? token : null;
}

export async function GET(req: NextRequest) {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const payload = await verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const account = await getOwnAccount(payload.userId);
    if (!account) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json(account);
  } catch (err) {
    await logerror('GET /api/v1/account/me error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
