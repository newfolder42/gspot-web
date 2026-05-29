import { apiClient } from './api';

export type LoginResult = {
  accessToken: string;
  refreshToken: string;
  user: { id: number; alias: string; email: string };
};

type ApiErrorBody = { error?: string };

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'Invalid email or password.',
  USER_EXISTS: 'An account with this email already exists.',
  ALIAS_EXISTS: 'This username is already taken.',
  INVALID_INPUT: 'Please check your input and try again.',
  INVALID_CODE: 'The verification code is incorrect.',
  EXPIRED: 'The verification code has expired.',
  INVALID_REFRESH_TOKEN: 'Your session has expired. Please log in again.',
  SERVER_ERROR: 'A server error occurred. Please try again later.',
  NO_PENDING_REGISTRATION: 'Registration not found. Please start over.',
};

function toUserFacingError(err: unknown): Error {
  const body = (err as any)?.response?.data as ApiErrorBody | undefined;
  if (body?.error) {
    return new Error(ERROR_MESSAGES[body.error] ?? body.error);
  }
  return new Error('Network error. Please check your connection.');
}

async function call<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    throw toUserFacingError(err);
  }
}

export const authApi = {
  login: (email: string, password: string): Promise<LoginResult> =>
    call(() =>
      apiClient.post<LoginResult>('/auth/login', { email, password }).then((r) => r.data)
    ),

  register: (name: string, alias: string, email: string, password: string): Promise<void> =>
    call(() =>
      apiClient.post('/auth/register', { name, alias, email, password }).then(() => undefined)
    ),

  verifyOTP: (email: string, code: string, type: 'registration' | 'password-reset'): Promise<void> =>
    call(() =>
      apiClient.post('/auth/verify-otp', { email, code, type }).then(() => undefined)
    ),

  resendOTP: (email: string): Promise<void> =>
    call(() =>
      apiClient.post('/auth/resend-otp', { email }).then(() => undefined)
    ),

  forgotPassword: (email: string): Promise<void> =>
    call(() =>
      apiClient.post('/auth/forgot-password', { email }).then(() => undefined)
    ),

  resetPassword: (email: string, code: string, newPassword: string): Promise<void> =>
    call(() =>
      apiClient.post('/auth/reset-password', { email, code, newPassword }).then(() => undefined)
    ),
};
