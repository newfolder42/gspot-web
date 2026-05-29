import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { rotateRefreshToken, createAccessToken } from '@/lib/mobile-jwt';
import { logerror } from '@/lib/logger';

const RefreshSchema = z.object({
  refreshToken: z.string().min(1).max(200),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RefreshSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }

    const rotated = await rotateRefreshToken(parsed.data.refreshToken);

    if (!rotated) {
      return NextResponse.json({ error: 'INVALID_REFRESH_TOKEN' }, { status: 401 });
    }

    const accessToken = await createAccessToken({
      userId: rotated.userId,
      alias: rotated.alias,
      email: rotated.email,
    });

    return NextResponse.json({
      accessToken,
      refreshToken: rotated.newRefreshToken,
    });
  } catch (err) {
    await logerror('POST /api/v1/auth/refresh error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
