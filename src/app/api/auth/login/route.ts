import { NextRequest, NextResponse } from 'next/server';
import { login } from '@/lib/auth';
import jwt from 'jsonwebtoken';

const JWT_EXPIRES_SECONDS = 60 * 60 * 24 * 7; // 7 days

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    const user = await login(email, password);

    const secret = process.env.SESSION_SECRET;
    if (!secret) {
      console.error('SESSION_SECRET not set');
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    const token = jwt.sign({ sub: user.id, alias: user.alias, sid: user.sessionId }, secret, { expiresIn: JWT_EXPIRES_SECONDS });

    const cookie = `user_token=${token}; HttpOnly; Path=/; Max-Age=${JWT_EXPIRES_SECONDS}; SameSite=Strict; Secure`;

    const res = NextResponse.json({ user }, { status: 200 });
    res.headers.set('Set-Cookie', cookie);
    return res;
  } catch (err: any) {
    if (err?.code === 'INVALID_EMAIL' || err?.code === 'INVALID_PASSWORD') {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err?.code === 'USER_NOT_FOUND' || err?.code === 'INVALID_CREDENTIALS') {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }
    if (err?.code === 'INTERNAL_ERROR') {
      console.error(err);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    console.error('Unexpected login error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
