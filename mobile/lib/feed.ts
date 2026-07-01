import { apiClient } from '@/lib/api';
import type { MobilePostType } from '@/types/post';

type FeedResponse = {
  posts: MobilePostType[];
};

type FeedPageParams = {
  limit?: number;
  cursorDate?: string;
  cursorId?: number;
};

type ApiErrorBody = { error?: string };

const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: 'ავტორიზაცია ამოიწურა. თავიდან შედი ანგარიშზე.',
  INVALID_INPUT: 'გვერდის მონაცემები არასწორია.',
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

function loadFeed(path: string, params?: FeedPageParams): Promise<MobilePostType[]> {
  return call(() =>
    apiClient
      .get<FeedResponse>(path, {
        params: {
          limit: params?.limit ?? 4,
          cursorDate: params?.cursorDate,
          cursorId: params?.cursorId,
        },
      })
      .then((r) => r.data.posts)
  );
}

export const feedApi = {
  /** Global feed – every published post in zones the user can see. */
  loadGlobal: (params?: FeedPageParams) => loadFeed('/feed/global', params),
  /** To-guess feed – gps-photo posts the user hasn't guessed yet. */
  loadToGuess: (params?: FeedPageParams) => loadFeed('/feed/to-guess', params),
};
