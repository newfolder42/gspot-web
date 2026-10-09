import { apiClient } from '@/lib/api';
import { uploadToSignedUrl } from '@/lib/upload';
import type { PostCommentType } from '@/types/post-comment';
import type { PostDetailResponse } from '@/types/post';
import type {
  LocationDisputeReason,
  PostLocationReviewAction,
  PostLocationState,
} from '@/types/post-location';
import type { GuessResult, PhotoGuessResult, PostGuessMapDataType } from '@/types/post-guess';

type ApiErrorBody = { error?: string };

const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: 'ავტორიზაცია ამოიწურა. თავიდან შედი ანგარიშზე.',
  INVALID_INPUT: 'შეყვანილი მონაცემები არასწორია.',
  NOT_FOUND: 'პოსტი ვერ მოიძებნა.',
  CREATE_COMMENT_FAILED: 'კომენტარის დამატება ვერ მოხერხდა.',
  OUTSIDE_GEORGIA: 'კოორდინატები საქართველოს ფარგლებს გარეთაა.',
  GUESS_FAILED: 'გამოცნობის შენახვა ვერ მოხერხდა.',
  UPDATE_FAILED: 'პოსტის განახლება ვერ მოხერხდა.',
  INVALID_TAG: 'თეგი ამ საბზონას არ ეკუთვნის.',
  FORBIDDEN: 'ამ მოქმედების უფლება არ გაქვს.',
  ALREADY_GUESSED: 'ეს უკვე გამოცნობილი გაქვს.',
  INVALID_STATE: 'ეს მოქმედება ამ პოსტზე ახლა შეუძლებელია.',
  NO_GUESS: 'გასაჩივრება მხოლოდ საკუთარ გამოცნობაზე შეგიძლია.',
  SCORE_TOO_HIGH: 'სრულყოფილი გამოცნობის გასაჩივრება შეუძლებელია.',
  ALREADY_DISPUTED: 'ეს უკვე გასაჩივრებული გაქვს.',
  LOCATION_UNCHANGED: 'ახალი ლოკაცია ძველთან ძალიან ახლოსაა. მონიშნე სხვა ადგილი.',
  SERVER_ERROR: 'სერვერის შეცდომა. სცადე მოგვიანებით.',
};

type CodedError = Error & { code?: string };

function toUserFacingError(err: unknown): Error {
  const body = (err as any)?.response?.data as ApiErrorBody | undefined;
  if (body?.error) {
    const coded: CodedError = new Error(ERROR_MESSAGES[body.error] ?? body.error);
    coded.code = body.error;
    return coded;
  }
  return new Error('ქსელური შეცდომა. შეამოწმე ინტერნეტი.');
}

/** The post was already guessed, e.g. on the web or another device since this screen loaded it. */
export function isAlreadyGuessedError(err: unknown): boolean {
  return (err as CodedError | undefined)?.code === 'ALREADY_GUESSED';
}

async function call<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    throw toUserFacingError(err);
  }
}

export const postsApi = {
  getPostDetail: (postId: number): Promise<PostDetailResponse> =>
    call(() => apiClient.get<PostDetailResponse>(`/posts/${postId}`).then((r) => r.data)),

  addComment: (postId: number, body: string, parentId?: number | null): Promise<PostCommentType> =>
    call(() =>
      apiClient
        .post<{ comment: PostCommentType }>(`/posts/${postId}/comments`, { body, parentId: parentId ?? null })
        .then((r) => r.data.comment)
    ),

  deletePost: (postId: number): Promise<void> =>
    call(() => apiClient.delete(`/posts/${postId}`).then(() => undefined)),

  addGuess: (
    postId: number,
    coordinates: { latitude: number; longitude: number }
  ): Promise<GuessResult> =>
    call(() =>
      apiClient
        .post<GuessResult>(`/posts/${postId}/guesses`, { coordinates })
        .then((r) => r.data)
    ),

  /** Edit title and/or zone tag. Owner only; omit a field to leave it unchanged. */
  updatePost: (
    postId: number,
    changes: { title?: string; tagId?: number | null }
  ): Promise<void> =>
    call(() => apiClient.patch(`/posts/${postId}`, changes).then(() => undefined)),

  /**
   * On-site ("ადგილზე") guess: upload the photo taken at the location, then send
   * its EXIF GPS. The server computes distance and score.
   */
  addPhotoGuess: async (
    postId: number,
    photo: { uri: string; size: number; type: string },
    coordinates: { latitude: number; longitude: number }
  ): Promise<PhotoGuessResult> =>
    call(async () => {
      const { data } = await apiClient.get<{ signedUrl: string }>(`/posts/${postId}/photo-guess`);
      const imageUrl = await uploadToSignedUrl(data.signedUrl, photo.uri, photo.type);
      const res = await apiClient.post<PhotoGuessResult>(`/posts/${postId}/photo-guess`, {
        coordinates,
        imageUrl,
      });
      return res.data;
    }),

  /** Author-only: every guess on the post plus the real photo location. */
  getGuessMap: (postId: number): Promise<PostGuessMapDataType> =>
    call(() =>
      apiClient.get<PostGuessMapDataType>(`/posts/${postId}/guesses`).then((r) => r.data)
    ),

  /**
   * A guesser contests the post's location; only a guess scored under 100 qualifies. A reason
   * is required, and "other" needs the guesser's own words in `note`.
   */
  disputeLocation: (
    postId: number,
    dispute: { reason: LocationDisputeReason; note?: string }
  ): Promise<void> =>
    call(() => apiClient.post(`/posts/${postId}/location-dispute`, dispute).then(() => undefined)),

  /**
   * Zone owner/admin decision on a disputed or suspended post. `note` is only used by
   * "suspend": it is what the author is told to fix.
   */
  reviewLocation: (
    postId: number,
    action: PostLocationReviewAction,
    note?: string
  ): Promise<PostLocationState> =>
    call(() =>
      apiClient
        .post<{ state: PostLocationState }>(`/posts/${postId}/location-review`, { action, note })
        .then((r) => r.data.state)
    ),

  /** Author of a suspended post: the real location. The post returns and guesses are re-scored. */
  correctLocation: (
    postId: number,
    coordinates: { latitude: number; longitude: number }
  ): Promise<void> =>
    call(() =>
      apiClient.post(`/posts/${postId}/location-correction`, { coordinates }).then(() => undefined)
    ),
};
