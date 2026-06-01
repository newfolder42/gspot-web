import { apiClient } from './api';

export type LoginResult = {
  accessToken: string;
  refreshToken: string;
  user: { id: number; alias: string; email: string };
};

type ApiErrorBody = { error?: string };

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'მეილი ან პაროლი არასწორია.',
  USER_EXISTS: 'მომხმარებელი ამ მეილით ან თიკუნით უკვე არსებობს.',
  ALIAS_EXISTS: 'დაკავებულია ან შეზღუდულია.',
  INVALID_INPUT: 'არასწორი მონაცემები.',
  INVALID_CODE: 'არასწორი კოდი.',
  EXPIRED: 'კოდის ვადა გასულია.',
  NOT_FOUND: 'კოდი ვერ მოიძებნა.',
  USER_NOT_FOUND: 'მომხმარებელი ამ მეილით ვერ მოიძებნა.',
  EMAIL_SEND_FAILED: 'მეილის გაგზავნა ვერ მოხერხდა.',
  INVALID_EMAIL: 'არასწორი მეილის ფორმატი.',
  INVALID_PASSWORD: 'პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო.',
  INVALID_REFRESH_TOKEN: 'სესია ამოიწურა. გთხოვ შეხვიდე ხელახლა.',
  SERVER_ERROR: 'სერვერის შეცდომა. გთხოვ ხელახლა სცადე.',
  NO_PENDING_REGISTRATION: 'რეგისტრაცია ვერ მოიძებნა. გთხოვ თავიდან სცადე.',
};

function toUserFacingError(err: unknown): Error {
  if (__DEV__) {
    console.error('[Auth Error Raw]', JSON.stringify((err as any)?.response?.data, null, 2));
    console.error('[Status]', (err as any)?.response?.status);
  }
  const body = (err as any)?.response?.data as ApiErrorBody | undefined;
  if (body?.error) {
    console.error('[Auth Error]', body.error);
    return new Error(ERROR_MESSAGES[body.error] ?? body.error);
  }
  return new Error('ქსელის შეცდომა. შეამოწმე კავშირი.');
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

  checkAlias: (alias: string): Promise<{ available: boolean }> =>
    call(() =>
      apiClient.get<{ available: boolean }>('/auth/check-alias', { params: { alias } }).then((r) => r.data)
    ),
};
