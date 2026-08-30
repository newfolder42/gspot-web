import { apiClient } from '@/lib/api';
import { uploadToSignedUrl } from '@/lib/upload';
import type {
  ActiveHideAndSeekType,
  HideAndSeekCheckResultType,
  HideAndSeekGameResponse,
  HideAndSeekListFilter,
  HideAndSeekListItemType,
} from '@/types/hide-and-seek';

type ApiErrorBody = { error?: string };

const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: 'ავტორიზაცია ამოიწურა. თავიდან შედი ანგარიშზე.',
  NOT_AUTHENTICATED: 'ჯერ გაიარე ავტორიზაცია.',
  NO_ACCESS: 'ამ თამაშზე წვდომა არ გაქვს.',
  ALREADY_IN_GAME: 'უკვე ერთ დამალობანაში ხარ, ჯერ ის დაასრულე.',
  GAME_NOT_FOUND: 'დამალობანა ვერ მოიძებნა.',
  GAME_ENDED: 'თამაში დასრულდა.',
  NOT_HOST: 'მხოლოდ ავტორს შეუძლია.',
  HOST_CANNOT_SEEK: 'ავტორი ვერ ჩაერთვება საკუთარ თამაშში.',
  NOT_PLAYING: 'ჯერ ჩაერთე თამაშში.',
  ALREADY_FOUND: 'უკვე იპოვე!',
  OUT_OF_CHECKS: 'მცდელობები ამოგეწურა.',
  INVALID_INPUT: 'შეყვანილი მონაცემები არასწორია.',
  INVALID_BODY: 'შეყვანილი მონაცემები არასწორია.',
  OUTSIDE_GEORGIA: 'კოორდინატები საქართველოს ფარგლებს გარეთაა.',
  NOT_FOUND: 'დამალობანა ვერ მოიძებნა.',
  FAILED: 'ვერ შესრულდა. სცადე თავიდან.',
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

export const hideAndSeekApi = {
  /** The one game this user is in, or null. Backs the floating ongoing-game button. */
  getActive: (): Promise<ActiveHideAndSeekType | null> =>
    call(() =>
      apiClient
        .get<{ game: ActiveHideAndSeekType | null }>('/hide-and-seek/active')
        .then((r) => r.data.game)
    ),

  /** Every game the user may see, current and past. */
  list: (filter: HideAndSeekListFilter = 'all', limit = 30, offset = 0): Promise<HideAndSeekListItemType[]> =>
    call(() =>
      apiClient
        .get<{ games: HideAndSeekListItemType[] }>('/hide-and-seek', { params: { filter, limit, offset } })
        .then((r) => r.data.games)
    ),

  getGame: (postId: number): Promise<HideAndSeekGameResponse> =>
    call(() =>
      apiClient.get<HideAndSeekGameResponse>(`/hide-and-seek/${postId}`).then((r) => r.data)
    ),

  create: (input: {
    title: string;
    coordinates: { latitude: number; longitude: number };
    durationMinutes: number;
    maxChecks: number;
    zoneId: number;
    zoneSlug: string;
    visibility: 'public' | 'private';
    inviteeAliases?: string[];
  }): Promise<{ postId: number; gameId: number }> =>
    call(() =>
      apiClient
        .post<{ postId: number; gameId: number }>('/hide-and-seek', input)
        .then((r) => r.data)
    ),

  /** Whether an alias exists, for the private-game invitee picker. */
  aliasExists: (alias: string): Promise<boolean> =>
    apiClient
      .get(`/users/${encodeURIComponent(alias)}`)
      .then(() => true)
      .catch(() => false),

  join: (postId: number): Promise<{ playerId: number; commentId: number }> =>
    call(() =>
      apiClient
        .post<{ playerId: number; commentId: number }>(`/hide-and-seek/${postId}/join`)
        .then((r) => r.data)
    ),

  /**
   * Upload the photo, then send the device position taken at capture time. The photo is
   * evidence; the coordinates are what the server measures — EXIF is frequently stripped
   * from camera captures and is editable besides.
   */
  submitCheck: async (
    postId: number,
    photo: { uri: string; type: string },
    coordinates: { latitude: number; longitude: number }
  ): Promise<HideAndSeekCheckResultType> =>
    call(async () => {
      const { data } = await apiClient.post<{ signedUrl: string }>('/hide-and-seek/upload-url');
      const imageUrl = await uploadToSignedUrl(data.signedUrl, photo.uri, photo.type);
      const res = await apiClient.post<HideAndSeekCheckResultType>(
        `/hide-and-seek/${postId}/check`,
        { coordinates, imageUrl }
      );
      return res.data;
    }),

  end: (postId: number): Promise<{ gameId: number }> =>
    call(() =>
      apiClient.post<{ gameId: number }>(`/hide-and-seek/${postId}/end`).then((r) => r.data)
    ),
};
