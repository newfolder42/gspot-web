import { NextRequest, NextResponse } from 'next/server';
import { getUserTokenAndValidate, verifyToken } from '@/lib/session';
import { endSessionById, endSessionByUserId } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(_request: NextRequest) {
  try {
    const payload = await getUserTokenAndValidate();
    if (payload.sessionId) {
      await endSessionById(payload.sessionId);
    } else if (payload.userId) {
      await endSessionByUserId(payload.userId);
    }
  } catch (err) {
    // token invalid — continue to clear cookie anyway
  }

  const cookie = `user_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict; Secure`;
  const res = NextResponse.json({ ok: true }, { status: 200 });
  res.headers.set('Set-Cookie', cookie);
  return res;
}
