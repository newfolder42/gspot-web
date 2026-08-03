import { apiClient } from '@/lib/api';
import type { RewardGivingStatusType, RewardSummaryType, RewardUserType } from '@/types/reward';

type ApiErrorBody = { error?: string };

const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: 'ავტორიზაცია ამოიწურა. თავიდან შედი ანგარიშზე.',
  INVALID_INPUT: 'შეყვანილი მონაცემები არასწორია.',
  REWARD_FAILED: 'ჯილდოს გაცემა ვერ მოხერხდა. სცადე თავიდან.',
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

export const rewardsApi = {
  /** Catalog + unlock state + remaining daily quota. Fetched when the sheet opens. */
  getStatus: (): Promise<RewardGivingStatusType> =>
    call(() => apiClient.get<RewardGivingStatusType>('/rewards/status').then((r) => r.data)),

  /** One-shot — a reward can never be removed or switched once given. */
  give: (postId: number, commentId: number | null, rewardKey: string): Promise<RewardSummaryType> =>
    call(() =>
      apiClient
        .post<RewardSummaryType>(`/posts/${postId}/rewards`, { commentId, rewardKey })
        .then((r) => r.data)
    ),

  getUsers: (postId: number, commentId: number | null): Promise<RewardUserType[]> =>
    call(() =>
      apiClient
        .get<{ users: RewardUserType[] }>(`/posts/${postId}/rewards`, {
          params: commentId != null ? { commentId } : undefined,
        })
        .then((r) => r.data.users)
    ),
};
