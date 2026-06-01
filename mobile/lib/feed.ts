import { apiClient } from '@/lib/api';
import type { MobilePostType } from '@/types/post';

export type MobileFeedFilter = 'all' | 'guessed' | 'not-guessed';

type GlobalFeedResponse = {
  posts: MobilePostType[];
};

type ApiErrorBody = { error?: string };

const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: 'ავტორიზაცია ამოიწურა. თავიდან შედი ანგარიშზე.',
  INVALID_INPUT: 'ფილტრის ან გვერდის მონაცემები არასწორია.',
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

export const feedApi = {
  loadGlobal: (params?: {
    limit?: number;
    filter?: MobileFeedFilter;
    cursorDate?: string;
    cursorId?: number;
  }): Promise<MobilePostType[]> =>
    call(() =>
      apiClient
        .get<GlobalFeedResponse>('/feed/global', {
          params: {
            limit: params?.limit ?? 4,
            filter: params?.filter ?? 'all',
            cursorDate: params?.cursorDate,
            cursorId: params?.cursorId,
          },
        })
        .then((r) => r.data.posts)
    ),
};
