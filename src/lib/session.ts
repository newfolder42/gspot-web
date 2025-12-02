"use server";

import jwt from 'jsonwebtoken';
import AppError from './errors';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { endSessionById, endSessionByUserId } from './auth';
import { logerror } from './logger';

type TokenPayload = {
  userId: number;
  alias: string,
  issuedAt?: number;
  expirationTime?: number;
  sessionId?: string;
};

function verifyToken(token: string): TokenPayload {
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
    logerror('verifyToken error:' + err);
    throw new AppError('Invalid or expired token', 'INVALID_TOKEN');
  }
}

export async function getUserIdFromRequest(req: NextRequest): Promise<number> {
  const cookie = req.cookies.get('user_token')?.value;
  if (!cookie) throw new AppError('Authentication required', 'NO_TOKEN');
  const payload = verifyToken(cookie);
  return payload.userId;
}

export async function getUserTokenAndValidate(): Promise<TokenPayload> {
  const ck = await cookies();
  const token = (ck.get && ck.get('user_token')?.value);
  if (!token) throw new AppError('Authentication required');

  return verifyToken(token as string);
}

export async function clearToken() {
  try {
    const ck = await cookies();
    const payload = await getUserTokenAndValidate();
    if (payload.sessionId) {
      await endSessionById(payload.sessionId);
    } else if (payload.userId) {
      await endSessionByUserId(payload.userId);
    }

    ck.set({
      name: 'user_token',
      value: '',
      httpOnly: true,
      path: '/',
      maxAge: 0,
      sameSite: 'strict',
      secure: true,
    });
  } catch (err) {
    logerror('clearToken error:' + err);
  }
}

export async function setToken(userId: number, alias: string, sessionId: number | null) {
  const JWT_EXPIRES_SECONDS = 60 * 60 * 24 * 7; // 7 days

  try {
    const secret = process.env.SESSION_SECRET;
    if (!secret) {
      console.error('SESSION_SECRET not set');
      throw new AppError('Server misconfiguration');
    }

    const token = jwt.sign({ sub: userId, alias: alias, sid: sessionId }, secret, { expiresIn: JWT_EXPIRES_SECONDS });

    const ck = await cookies();
    ck.set({
      name: 'user_token',
      value: token,
      httpOnly: true,
      path: '/',
      maxAge: JWT_EXPIRES_SECONDS,
      sameSite: 'strict',
      secure: true,
    });
  } catch (err: any) {
    logerror('setToken error:' + err);
    throw new AppError(err + ' Internal server error');
  }
}