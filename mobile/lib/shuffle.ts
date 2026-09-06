import { apiClient } from '@/lib/api';
import type { MobilePostType } from '@/types/post';

/** Posts dealt per deck. Mirrors SHUFFLE_DECK_SIZE on the web. */
export const SHUFFLE_DECK_SIZE = 10;

/** How many dealt ids ride along as "don't deal these again" (the API caps it too). */
export const SHUFFLE_EXCLUDE_LIMIT = 200;

type DeckResponse = { posts: MobilePostType[] };

const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: 'ავტორიზაცია ამოიწურა. თავიდან შედი ანგარიშზე.',
  INVALID_INPUT: 'გვერდის მონაცემები არასწორია.',
  SERVER_ERROR: 'სერვერის შეცდომა. სცადე მოგვიანებით.',
};

function toUserFacingError(err: unknown): Error {
  const body = (err as any)?.response?.data as { error?: string } | undefined;
  if (body?.error) {
    return new Error(ERROR_MESSAGES[body.error] ?? body.error);
  }
  return new Error('ქსელური შეცდომა. შეამოწმე ინტერნეტი.');
}

export const shuffleApi = {
  /** The next shuffled deck, minus the ids already dealt this session. */
  loadDeck: async (excludeIds: number[]): Promise<MobilePostType[]> => {
    try {
      const res = await apiClient.get<DeckResponse>('/feed/shuffle', {
        params: {
          limit: SHUFFLE_DECK_SIZE,
          exclude: excludeIds.length ? excludeIds.join(',') : undefined,
        },
      });
      return res.data.posts;
    } catch (err) {
      throw toUserFacingError(err);
    }
  },

  /** Fire-and-forget: a lost skip only means the post comes round again. */
  skip: async (postIds: number[]): Promise<void> => {
    try {
      await apiClient.post('/feed/shuffle/skip', { postIds });
    } catch {
      // ignored on purpose
    }
  },
};
