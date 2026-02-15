"use server";

import bcrypt from 'bcrypt';
import { query } from "@/lib/db";
import type { UserToRegister } from '@/types/user';
import { logerror } from './logger';
import { createOTP } from './otp';
import { sendOTPEmail } from './email';

function isEmail(s: string) {
  return typeof s === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);
}

async function isEmailOrAliasInUsers(email: string, alias: string): Promise<boolean> {
  try {
    const result = await query(
      'SELECT id FROM users WHERE LOWER(email) = $1 OR LOWER(alias) = $2',
      [email.toLowerCase(), alias.toLowerCase()]
    );
    return result.rows.length > 0;
  } catch (err) {
    await logerror('isEmailOrAliasInUsers error:', [err]);
    throw err;
  }
}

async function createOrUpdatePendingRegistration(
  email: string,
  alias: string,
  name: string,
  passwordHash: string
) {
  try {
    const existingAlias = await query(
      'SELECT id FROM pending_registrations WHERE LOWER(alias) = $1 AND LOWER(email) != $2',
      [alias.toLowerCase(), email.toLowerCase()]
    );

    if (existingAlias.rows.length > 0) {
      throw new Error('ALIAS_EXISTS');
    }

    await query('DELETE FROM pending_registrations WHERE LOWER(email) = $1', [email.toLowerCase()]);

    const result = await query(
      'INSERT INTO pending_registrations (email, alias, name, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, email',
      [email.toLowerCase(), alias, name, passwordHash]
    );

    return result.rows[0];
  } catch (err) {
    await logerror('createOrUpdatePendingRegistration error:', [err]);
    throw err;
  }
}

export async function signup(user: UserToRegister) {
  const name = typeof user.name === 'string' ? user.name.trim() : '';
  const alias = typeof user.alias === 'string' ? user.alias.trim().toLowerCase() : '';
  const email = user.email.toLowerCase();
  const password = user.password;

  if (!name || !alias) throw new Error('INVALID_INPUT');
  if (!/^[a-z0-9_-]+$/.test(alias) || alias.length < 3 || alias.length > 30) throw new Error('INVALID_INPUT');
  if (!isEmail(email)) throw new Error('INVALID_INPUT');
  if (typeof password !== 'string' || password.length < 6) throw new Error('INVALID_INPUT');

  try {
    const userExists = await isEmailOrAliasInUsers(email, alias);
    if (userExists) throw new Error('USER_EXISTS');

    const passwordHash = await bcrypt.hash(password, 10);

    await createOrUpdatePendingRegistration(email, alias, name, passwordHash);

    try {
      const otpCode = await createOTP(email);
      await sendOTPEmail(email, otpCode);
    } catch (otpErr) {
      await logerror('OTP email error:', [otpErr]);
    }
  } catch (err) {
    await logerror('signup error:', [err]);
    throw err;
  }
}

export async function userAliasTaken(userAlias: string) {
  try {
    const res = await query(
      `SELECT COUNT(1) as count FROM users WHERE LOWER(alias) = $1 
             UNION ALL
             SELECT COUNT(1) as count FROM pending_registrations WHERE LOWER(alias) = $1`,
      [userAlias.toLowerCase()]
    );
    return res.rows.some(row => parseInt(row.count) > 0);
  } catch (err) {
    await logerror('alias check:', [err]);
    return true;
  }
}