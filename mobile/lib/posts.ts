import { apiClient } from '@/lib/api';
import type { PostCommentType } from '@/types/post-comment';
import type { PostDetailResponse } from '@/types/post';
import type { GuessResult } from '@/types/post-guess';

type ApiErrorBody = { error?: string };

const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: 'ავტორიზაცია ამოიწურა. თავიდან შედი ანგარიშზე.',
  INVALID_INPUT: 'შეყვანილი მონაცემები არასწორია.',
  NOT_FOUND: 'პოსტი ვერ მოიძებნა.',
  CREATE_COMMENT_FAILED: 'კომენტარის დამატება ვერ მოხერხდა.',
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
};
