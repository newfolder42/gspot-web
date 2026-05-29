import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { query } from '@/lib/db';
import { createAccessToken, createAndStoreRefreshToken } from '@/lib/mobile-jwt';
import { logerror } from '@/lib/logger';

const LoginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(128),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }

    const { email, password } = parsed.data;

    const result = await query(
      'SELECT id, alias, email, password_hash FROM users WHERE LOWER(email) = $1',
      [email.toLowerCase()]
    );

    // Use constant-time comparison even when no user found to prevent timing attacks
    if (result.rows.length === 0) {
      await bcrypt.compare(password, '$2b$10$invalidhashfortimingnnnnnnnnnnnnnnnnnnnnnnnnn');
      return NextResponse.json({ error: 'INVALID_CREDENTIALS' }, { status: 401 });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return NextResponse.json({ error: 'INVALID_CREDENTIALS' }, { status: 401 });
    }

    const payload = { userId: user.id as number, alias: user.alias as string, email: user.email as string };
    const [accessToken, refreshToken] = await Promise.all([
      createAccessToken(payload),
      createAndStoreRefreshToken(user.id),
    ]);

    return NextResponse.json({
      accessToken,
      refreshToken,
      user: { id: user.id, alias: user.alias, email: user.email },
    });
  } catch (err) {
    await logerror('POST /api/v1/auth/login error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
