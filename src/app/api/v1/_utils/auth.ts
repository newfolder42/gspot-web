import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, type AccessTokenPayload } from '@/lib/mobile-jwt';

function extractBearerToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7).trim();
  return token.length > 0 ? token : null;
}

export async function requireMobileUser(req: NextRequest): Promise<
  { user: AccessTokenPayload; response: null } |
  { user: null; response: NextResponse }
> {
  const token = extractBearerToken(req);
  if (!token) {
    return {
      user: null,
      response: NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 }),
    };
  }

  const payload = await verifyAccessToken(token);
  if (!payload) {
    return {
      user: null,
      response: NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 }),
    };
  }

  return { user: payload, response: null };
}
