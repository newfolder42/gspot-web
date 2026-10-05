import { query } from "@/lib/db";
import { logerror } from "./logger";
import { sendOTPEmail } from "./email";
import type { OTPVerificationResult } from "@/types/otp";

const OTP_EXPIRY_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;
// Guesses allowed per code. With MAX_OTP_ATTEMPTS codes an hour, that caps a
// brute force at a few dozen of the 900,000 possible codes.
const MAX_GUESSES_PER_CODE = 5;
const OTP_RESEND_COOLDOWN_MS = 60_000;

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
    await logerror('createOTP error', [err]);
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

    // Spend one guess on the email's live code before comparing. Doing it in one
    // UPDATE means concurrent guesses can't all slip in under the limit: Postgres
    // re-checks `attempts < $2` against the row each waiting UPDATE ends up seeing.
    const guess = await query(
      `UPDATE email_verification_otps
SET attempts = attempts + 1
WHERE id = (
  SELECT id FROM email_verification_otps
  WHERE email = $1 AND verified = false
  ORDER BY created_at DESC
  LIMIT 1
)
AND attempts < $2
AND expires_at > NOW()
RETURNING id, code, attempts`,
      [normalizedEmail, MAX_GUESSES_PER_CODE]
    );

    if (guess.rows.length === 0) {
      // Either no code was sent, or the live one has expired or run out of guesses.
      // EXPIRED tells both clients to ask for a new code.
      const live = await query(
        'SELECT 1 FROM email_verification_otps WHERE email = $1 AND verified = false LIMIT 1',
        [normalizedEmail]
      );
      return { success: false, error: live.rows.length > 0 ? 'EXPIRED' : 'INVALID_CODE' };
    }

    const otp = guess.rows[0];

    if (otp.code !== normalizedCode) {
      return {
        success: false,
        error: otp.attempts >= MAX_GUESSES_PER_CODE ? 'EXPIRED' : 'INVALID_CODE',
      };
    }

    // `verified = false` guard: the same code can't be spent by two requests at once.
    const spent = await query(
      'UPDATE email_verification_otps SET verified = true WHERE id = $1 AND verified = false RETURNING id',
      [otp.id]
    );

    if (spent.rows.length === 0) {
      return { success: false, error: 'INVALID_CODE' };
    }

    return { success: true };
  } catch (err) {
    await logerror('verifyOTP error', [err]);
    return { success: false, error: 'SERVER_ERROR' };
  }
}

/** True when a code went to this email less than a minute ago. */
export async function isOTPOnCooldown(email: string): Promise<boolean> {
  const recentOTP = await query(
    `SELECT created_at FROM email_verification_otps 
     WHERE email = $1 
     ORDER BY created_at DESC 
     LIMIT 1`,
    [email.toLowerCase()]
  );

  if (recentOTP.rows.length === 0) return false;

  const lastOTPTime = new Date(recentOTP.rows[0].created_at);
  return Date.now() - lastOTPTime.getTime() < OTP_RESEND_COOLDOWN_MS;
}

export async function hasPendingRegistration(email: string): Promise<boolean> {
  try {
    const result = await query(
      'SELECT id FROM pending_registrations WHERE LOWER(email) = $1',
      [email.toLowerCase()]
    );
    return result.rows.length > 0;
  } catch (err) {
    await logerror('hasPendingRegistration error', [err]);
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

    if (await isOTPOnCooldown(normalizedEmail)) {
      return {
        success: false,
        error: 'გთხოვ მოიცადე სანამ ახალი კოდის გაგზავნას შეძლებ (1 წუთი).'
      };
    }

    const code = await createOTP(normalizedEmail);
    await sendOTPEmail(normalizedEmail, code);

    return { success: true };
  } catch (err) {
    await logerror('resendOTP error', [err]);
    return { success: false, error: 'გაურკვეველი ხარვეზი' };
  }
}
