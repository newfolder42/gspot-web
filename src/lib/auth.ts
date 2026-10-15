import bcrypt from 'bcrypt';
import { query, withTransaction } from "@/lib/db";
import type { UserToRegister } from '@/types/user';
import type { OTPVerificationResult } from '@/types/otp';
import { logerror } from './logger';
import { createOTP, isOTPOnCooldown, verifyOTP } from './otp';
import { recordPendingRegistrationHistory, type PendingRegistrationSnapshot } from './pendingRegistrationHistory';
import { sendOTPEmail, sendWelcomeEmail } from './email';

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

    const replaced = await query(
      'DELETE FROM pending_registrations WHERE LOWER(email) = $1 RETURNING id, email, alias, name, created_at',
      [email.toLowerCase()]
    );
    await recordPendingRegistrationHistory(replaced.rows, 'replaced');

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
             SELECT COUNT(1) as count FROM pending_registrations WHERE LOWER(alias) = $1
             UNION ALL
             SELECT COUNT(1) as count FROM restricted_inputs WHERE slug = $1`,
      [userAlias.toLowerCase()]
    );
    return res.rows.some(row => parseInt(row.count) > 0);
  } catch (err) {
    await logerror('alias check:', [err]);
    return true;
  }
}

class MissingPendingRegistrationError extends Error {}

export type RegistrationCompletionError =
  | NonNullable<OTPVerificationResult['error']>
  | 'NO_PENDING_REGISTRATION';

/**
 * Spends the emailed code and creates the user in one transaction, so a failure to
 * create the user (no pending row, unique violation, ...) leaves the code unspent
 * and the user can try again instead of ending up verified-but-without-an-account.
 */
export async function verifyAndCompleteRegistration(
  email: string,
  code: string
): Promise<{ success: boolean; error?: RegistrationCompletionError }> {
  const normalizedEmail = email.toLowerCase();
  // Held in an object: TS doesn't see assignments made inside the transaction callback.
  const ctx: { pending: PendingRegistrationSnapshot | null; alias: string } = { pending: null, alias: '' };

  try {
    const otpFailure = await withTransaction(async (client) => {
      const exec = (text: string, params?: any[]) => client.query(text, params);

      const otpResult = await verifyOTP(normalizedEmail, code, exec);
      // Committed on purpose: a wrong guess must still count against the code.
      if (!otpResult.success) return otpResult.error ?? 'INVALID_CODE';

      // FOR UPDATE: two concurrent completions can't both create the user.
      const pendingResult = await exec(
        'SELECT id, name, alias, password_hash, created_at FROM pending_registrations WHERE LOWER(email) = $1 FOR UPDATE',
        [normalizedEmail]
      );

      if (pendingResult.rows.length === 0) {
        throw new MissingPendingRegistrationError();
      }

      const row = pendingResult.rows[0];
      ctx.pending = { id: row.id, email: normalizedEmail, alias: row.alias, name: row.name, created_at: row.created_at };
      ctx.alias = row.alias;

      const createdUser = await exec(
        'INSERT INTO users (name, alias, email, password_hash, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id',
        [row.name, row.alias, normalizedEmail, row.password_hash]
      );

      const userId = createdUser.rows[0]?.id;
      if (userId) {
        await exec('INSERT INTO user_options (user_id) VALUES ($1)', [userId]);
        await exec('INSERT INTO zone_members (zone_id, user_id) VALUES (1, $1)', [userId]);
      }

      await exec('DELETE FROM pending_registrations WHERE id = $1', [row.id]);

      return null;
    });

    if (otpFailure) return { success: false, error: otpFailure };
  } catch (err) {
    if (err instanceof MissingPendingRegistrationError) {
      await logerror('verifyAndCompleteRegistration: correct code but no pending registration', [normalizedEmail]);
      await recordPendingRegistrationHistory(
        [{ id: null, email: normalizedEmail, alias: null, name: null, created_at: null }],
        'missing',
        'correct code, pending registration already gone (expired or replaced); code left unspent'
      );
      return { success: false, error: 'NO_PENDING_REGISTRATION' };
    }

    await logerror('verifyAndCompleteRegistration error', [err]);
    await recordPendingRegistrationHistory(
      [ctx.pending ?? { id: null, email: normalizedEmail, alias: null, name: null, created_at: null }],
      'failed',
      err instanceof Error ? err.message : String(err)
    );
    return { success: false, error: 'SERVER_ERROR' };
  }

  if (ctx.pending) {
    await recordPendingRegistrationHistory([ctx.pending], 'completed');
  }

  try {
    await sendWelcomeEmail(normalizedEmail, ctx.alias);
  } catch (err) {
    await logerror('Welcome email error', [err]);
  }

  return { success: true };
}

export async function initiatePasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedEmail = email.toLowerCase();

    if (!isEmail(normalizedEmail)) {
      return { success: false, error: 'INVALID_EMAIL' };
    }

    const userResult = await query(
      'SELECT id FROM users WHERE LOWER(email) = $1',
      [normalizedEmail]
    );

    if (userResult.rows.length === 0) {
      return { success: false, error: 'USER_NOT_FOUND' };
    }

    // Without this anyone could flood an address with reset emails, each one
    // also cancelling the code before it. The code already sent stays valid.
    if (await isOTPOnCooldown(normalizedEmail)) {
      return { success: false, error: 'TOO_SOON' };
    }

    try {
      const otpCode = await createOTP(normalizedEmail);
      await sendOTPEmail(normalizedEmail, otpCode);
    } catch (otpErr) {
      await logerror('Password reset OTP email error:', [otpErr]);
      return { success: false, error: 'EMAIL_SEND_FAILED' };
    }

    return { success: true };
  } catch (err) {
    await logerror('initiatePasswordReset error', [err]);
    return { success: false, error: 'SERVER_ERROR' };
  }
}
