import { apiClient } from '@/lib/api';
import type { VoteSummaryType, VoteValue } from '@/types/vote';

type ApiErrorBody = { error?: string };

const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: 'ავტორიზაცია ამოიწურა. თავიდან შედი ანგარიშზე.',
  INVALID_INPUT: 'შეყვანილი მონაცემები არასწორია.',
  VOTE_FAILED: 'ხმის მიცემა ვერ მოხერხდა.',
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

export const votesApi = {
  /** Same value again removes the vote; the opposite value switches it. */
  toggle: (postId: number, commentId: number | null, value: VoteValue): Promise<VoteSummaryType> =>
    call(() =>
      apiClient
        .post<VoteSummaryType>(`/posts/${postId}/vote`, { commentId, value })
        .then((r) => r.data)
    ),
};
