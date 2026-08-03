import { apiClient } from '@/lib/api';
import type { HeatmapResponse } from '@/types/heatmap';

type ApiErrorBody = { error?: string };

const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: 'ავტორიზაცია ამოიწურა. თავიდან შედი ანგარიშზე.',
  INVALID_INPUT: 'შეყვანილი მონაცემები არასწორია.',
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

export const heatmapApi = {
  /** `global` = every public-zone post; `me` = the caller's own posts only. */
  get: (scope: 'global' | 'me'): Promise<HeatmapResponse> =>
    call(() =>
      apiClient.get<HeatmapResponse>('/heatmap', { params: { scope } }).then((r) => r.data)
    ),
};
