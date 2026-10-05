"use server";

// The only auth functions the browser may call. Anything that trusts its
// arguments (creating OTPs, completing a registration, setting a password by
// email) lives in plain lib modules and is reached from here only after the
// emailed code has been verified in the same call.

import {
  signup as signupUser,
  userAliasTaken as isUserAliasTaken,
  completePendingRegistration,
  initiatePasswordReset as startPasswordReset,
} from "@/lib/auth";
import { verifyOTP, resendOTP } from "@/lib/otp";
import { resetPassword } from "@/lib/password";
import type { UserToRegister } from "@/types/user";
import type { OTPVerificationResult } from "@/types/otp";

type OTPError = NonNullable<OTPVerificationResult['error']>;

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

export async function signup(user: UserToRegister) {
  return signupUser(user);
}

export async function userAliasTaken(userAlias: string) {
  if (!isString(userAlias)) return true;
  return isUserAliasTaken(userAlias);
}

export async function initiatePasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
  if (!isString(email)) return { success: false, error: 'INVALID_EMAIL' };
  return startPasswordReset(email);
}

export async function resendRegistrationCode(email: string): Promise<{ success: boolean; error?: string }> {
  if (!isString(email)) return { success: false, error: 'გაურკვეველი ხარვეზი' };
  return resendOTP(email);
}

export async function verifyRegistrationCode(
  email: string,
  code: string
): Promise<{ success: boolean; error?: OTPError | 'REGISTRATION_FAILED' }> {
  if (!isString(email) || !isString(code)) return { success: false, error: 'INVALID_CODE' };

  const otpResult = await verifyOTP(email, code);
  if (!otpResult.success) return { success: false, error: otpResult.error };

  const result = await completePendingRegistration(email);
  if (!result.success) return { success: false, error: 'REGISTRATION_FAILED' };

  return { success: true };
}

export async function resetPasswordWithCode(
  email: string,
  code: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  if (!isString(email) || !isString(code) || !isString(newPassword)) {
    return { success: false, error: 'INVALID_INPUT' };
  }

  // Checked before verifyOTP, which spends the code: a too-short password
  // shouldn't cost the user their code.
  if (newPassword.length < 6) return { success: false, error: 'INVALID_PASSWORD' };
  if (newPassword.length > 128) return { success: false, error: 'INVALID_INPUT' };

  const otpResult = await verifyOTP(email, code);
  if (!otpResult.success) return { success: false, error: otpResult.error };

  return resetPassword(email, newPassword);
}
