import { apiClient } from '@/lib/api';

export type ReportTargetType = 'post' | 'comment' | 'user';

export type ReportReason =
  | 'child_safety'
  | 'nudity_sexual_content'
  | 'harassment_threats'
  | 'violence'
  | 'spam'
  | 'other';

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  child_safety: 'არასრულწლოვნის უსაფრთხოება',
  nudity_sexual_content: 'შიშველი ან სექსუალური კონტენტი',
  harassment_threats: 'შეურაცხყოფა ან მუქარა',
  violence: 'ძალადობა',
  spam: 'სპამი',
  other: 'სხვა',
};

type ApiErrorBody = { error?: string };

const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: 'ავტორიზაცია ამოიწურა. თავიდან შედი ანგარიშზე.',
  INVALID_INPUT: 'შეყვანილი მონაცემები არასწორია.',
  REPORT_FAILED: 'რეპორტის გაგზავნა ვერ მოხერხდა.',
  SERVER_ERROR: 'სერვერის შეცდომა. სცადე მოგვიანებით.',
};

function toUserFacingError(err: unknown): Error {
  const body = (err as any)?.response?.data as ApiErrorBody | undefined;
  if (body?.error) {
    return new Error(ERROR_MESSAGES[body.error] ?? body.error);
  }
  return new Error('ქსელური შეცდომა. შეამოწმე ინტერნეტი.');
}

async function call<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    throw toUserFacingError(err);
  }
}

export const reportsApi = {
  submit: (
    targetType: ReportTargetType,
    targetId: number,
    reason: ReportReason,
    details?: string
  ): Promise<void> =>
    call(() =>
      apiClient
        .post('/reports', { targetType, targetId, reason, details: details || undefined })
        .then(() => undefined)
    ),
};
