import { NextRequest, NextResponse } from 'next/server';
import { handleGoogleCallback } from '@/lib/google-auth';
import { setToken } from '@/lib/session';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL('/auth/signin?error=google_auth_failed', req.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/auth/signin?error=missing_code', req.url));
  }

  try {
    const user = await handleGoogleCallback(code);
    await setToken(user.userId, user.alias, user.sessionId);
    return NextResponse.redirect(new URL('/', req.url));
  } catch (error) {
    console.error('Google callback error:', error);
    return NextResponse.redirect(new URL('/auth/signin?error=auth_failed', req.url));
  }
}
