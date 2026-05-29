import { SignJWT, jwtVerify } from 'jose';
import { randomBytes } from 'crypto';
import { query } from './db';
import { logerror } from './logger';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 30;

function getSecret(): Uint8Array {
  const secret = process.env.MOBILE_JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('MOBILE_JWT_SECRET must be set and at least 32 characters');
  }
  return new TextEncoder().encode(secret);
}

export type AccessTokenPayload = {
  userId: number;
  alias: string;
  email: string;
};

export async function createAccessToken(payload: AccessTokenPayload): Promise<string> {
  return new SignJWT({ userId: payload.userId, alias: payload.alias, email: payload.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .setSubject(String(payload.userId))
    .sign(getSecret());
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (
      typeof payload.userId !== 'number' ||
      typeof payload.alias !== 'string' ||
      typeof payload.email !== 'string'
    ) {
      return null;
    }
    return { userId: payload.userId, alias: payload.alias, email: payload.email };
  } catch {
    return null;
  }
}

export async function createAndStoreRefreshToken(userId: number): Promise<string> {
  const token = randomBytes(40).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  // Keep at most 5 active refresh tokens per user (oldest deleted first)
  await query(
    `DELETE FROM refresh_tokens
     WHERE user_id = $1
       AND id NOT IN (
         SELECT id FROM refresh_tokens
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 4
       )`,
    [userId]
  );

  await query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [userId, token, expiresAt]
  );

  return token;
}

export async function rotateRefreshToken(
  oldToken: string
): Promise<{ userId: number; alias: string; email: string; newRefreshToken: string } | null> {
  try {
    // Atomically delete the old token and return the owner
    const result = await query(
      `DELETE FROM refresh_tokens
       WHERE token = $1 AND expires_at > NOW()
       RETURNING user_id`,
      [oldToken]
    );

    if (result.rows.length === 0) return null;

    const userId = result.rows[0].user_id as number;

    const userResult = await query(
      'SELECT alias, email FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) return null;

    const { alias, email } = userResult.rows[0];
    const newRefreshToken = await createAndStoreRefreshToken(userId);

    return { userId, alias, email, newRefreshToken };
  } catch (err) {
    await logerror('rotateRefreshToken error', { error: String(err) });
    return null;
  }
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await query('DELETE FROM refresh_tokens WHERE token = $1', [token]);
}

export async function revokeAllUserRefreshTokens(userId: number): Promise<void> {
  await query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
}
