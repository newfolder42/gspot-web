import jwt from 'jsonwebtoken';
import AppError from './errors';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

type TokenPayload = {
  userId: number;
  alias: string,
  issuedAt?: number;
  expirationTime?: number;
  sessionId?: string;
};

export function verifyToken(token: string): TokenPayload {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new AppError('Session secret not configured', 'INTERNAL_ERROR');
  try {
    const payload = jwt.verify(token, secret) as jwt.JwtPayload;
    return {
      userId: +(payload.sub as string),
      alias: payload.alias as string,
      issuedAt: payload.iat,
      expirationTime: payload.exp,
      sessionId: payload.sid as string,
    };
  } catch (err) {
    console.error('verifyToken error:', err);
    throw new AppError('Invalid or expired token', 'INVALID_TOKEN');
  }
}

export function getUserIdFromRequest(req: NextRequest): number | string {
  const cookie = req.cookies.get('user_token')?.value;
  if (!cookie) throw new AppError('Authentication required', 'NO_TOKEN');
  const payload = verifyToken(cookie);
  return payload.userId;
}

export async function getUserToken(): Promise<string | null> {
  const ck = await cookies();
  return (ck.get && ck.get('user_token')?.value) ?? null;
}

export async function getUserTokenAndValidate(): Promise<TokenPayload> {
  const ck = await cookies();
  const token = (ck.get && ck.get('user_token')?.value);
  if (!token) throw new AppError('Authentication required');

  return verifyToken(token as string);
}

export default { verifyToken, getUserIdFromRequest };
