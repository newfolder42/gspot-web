"use server";

import { query } from "@/lib/db";
import { logerror } from "./logger";
import { sendOTPEmail, sendWelcomeEmail } from "./email";
import type { OTPVerificationResult } from "@/types/otp";

const OTP_EXPIRY_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;

function generateOTPCode(): string {
  const array = new Uint32Array(6);
  crypto.getRandomValues(array);
  const code = (array[0] % 900000 + 100000).toString();
  return code;
}

export async function createOTP(email: string): Promise<string> {
  try {
    const code = generateOTPCode();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await query(
      'UPDATE email_verification_otps SET verified = true WHERE email = $1 AND verified = false',
      [email.toLowerCase()]
    );

    await query(
      'INSERT INTO email_verification_otps (email, code, expires_at) VALUES ($1, $2, $3)',
      [email.toLowerCase(), code, expiresAt]
    );

    return code;
  } catch (err) {
    logerror('createOTP error', [err]);
    throw err;
  }
}

export async function verifyOTP(email: string, code: string): Promise<OTPVerificationResult> {
  try {
    const normalizedEmail = email.toLowerCase();
    const normalizedCode = code.trim();

    if (!normalizedCode || normalizedCode.length !== 6 || !/^\d{6}$/.test(normalizedCode)) {
      return { success: false, error: 'INVALID_CODE' };
    }

    const recentAttempts = await query(
      `SELECT COUNT(*) as count FROM email_verification_otps 
WHERE email = $1
AND created_at > NOW() - INTERVAL '1 hour'`,
      [normalizedEmail]
    );

    if (parseInt(recentAttempts.rows[0].count) > MAX_OTP_ATTEMPTS) {
      return { success: false, error: 'EXPIRED' };
    }

    const result = await query(
      `SELECT id, expires_at 
FROM email_verification_otps 
WHERE email = $1 AND code = $2 and verified = false
ORDER BY created_at DESC 
LIMIT 1`,
      [normalizedEmail, normalizedCode]
    );

    if (result.rows.length === 0) {
      return { success: false, error: 'INVALID_CODE' };
    }

    const otp = result.rows[0];

    if (new Date(otp.expires_at) < new Date()) {
      return { success: false, error: 'EXPIRED' };
    }

    await query(
      'UPDATE email_verification_otps SET verified = true WHERE id = $1',
      [otp.id]
    );

    return { success: true };
  } catch (err) {
    logerror('verifyOTP error', [err]);
    return { success: false, error: 'SERVER_ERROR' };
  }
}

export async function completePendingRegistration(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedEmail = email.toLowerCase();

    const pendingResult = await query(
      'SELECT id, name, alias, password_hash FROM pending_registrations WHERE LOWER(email) = $1',
      [normalizedEmail]
    );

    if (pendingResult.rows.length === 0) {
      return { success: false, error: 'NO_PENDING_REGISTRATION' };
    }

    const pending = pendingResult.rows[0];

    await query(
      'INSERT INTO users (name, alias, email, password_hash, created_at) VALUES ($1, $2, $3, $4, NOW())',
      [pending.name, pending.alias, normalizedEmail, pending.password_hash]
    );

    await query(
      'DELETE FROM pending_registrations WHERE id = $1',
      [pending.id]
    );

    try {
      await sendWelcomeEmail(normalizedEmail, pending.alias);
    } catch (err) {
      logerror('Welcome email error', [err]);
    }

    return { success: true };
  } catch (err) {
    logerror('completePendingRegistration error', [err]);
    return { success: false, error: 'SERVER_ERROR' };
  }
}

export async function hasPendingRegistration(email: string): Promise<boolean> {
  try {
    const result = await query(
      'SELECT id FROM pending_registrations WHERE LOWER(email) = $1',
      [email.toLowerCase()]
    );
    return result.rows.length > 0;
  } catch (err) {
    logerror('hasPendingRegistration error', [err]);
    return false;
  }
}

export async function resendOTP(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedEmail = email.toLowerCase();

    const hasPending = await hasPendingRegistration(normalizedEmail);
    if (!hasPending) {
      return {
        success: false,
        error: 'რეგისტრაცია ვერ მოიძებნა'
      };
    }

    const recentOTP = await query(
      `SELECT created_at FROM email_verification_otps 
       WHERE email = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [normalizedEmail]
    );

    if (recentOTP.rows.length > 0) {
      const lastOTPTime = new Date(recentOTP.rows[0].created_at);
      const timeSinceLastOTP = Date.now() - lastOTPTime.getTime();

      if (timeSinceLastOTP < 60000) {
        return {
          success: false,
          error: 'გთხოვ მოიცადე სანამ ახალი კოდის გაგზავნას შეძლებ (1 წუთი).'
        };
      }
    }

    const code = await createOTP(normalizedEmail);
    await sendOTPEmail(normalizedEmail, code);

    return { success: true };
  } catch (err) {
    logerror('resendOTP error', [err]);
    return { success: false, error: 'გაურკვეველი ხარვეზი' };
  }
}
