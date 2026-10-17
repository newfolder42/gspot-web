import { Alert, Platform, ToastAndroid } from 'react-native';
import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { syncPostInCaches } from '@/lib/postCache';
import type { PostBookmarkType } from '@/types/bookmark';

/** Rows per page of ჩამახსოვრებულები. Mirrors POST_BOOKMARKS_PAGE_SIZE on the web. */
export const POST_BOOKMARKS_PAGE_SIZE = 30;

/** The saved-posts list; invalidated whenever a post is saved or removed. */
export const POST_BOOKMARKS_KEY = ['post-bookmarks'] as const;

type ApiErrorBody = { error?: string };

const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: 'ავტორიზაცია ამოიწურა. თავიდან შედი ანგარიშზე.',
  INVALID_INPUT: 'შეყვანილი მონაცემები არასწორია.',
  NOT_FOUND: 'პოსტი ვერ მოიძებნა.',
  BOOKMARK_FAILED: 'ვერ მოხერხდა. სცადე მოგვიანებით.',
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

export const bookmarksApi = {
  /** Both directions are idempotent on the server, so a retry is always safe. */
  addPost: (postId: number): Promise<void> =>
    call(() => apiClient.put(`/posts/${postId}/bookmark`).then(() => undefined)),

  removePost: (postId: number): Promise<void> =>
    call(() => apiClient.delete(`/posts/${postId}/bookmark`).then(() => undefined)),

  /** Newest save first; page with the last row's `id` as `cursorId`. */
  listPosts: (params: { limit?: number; cursorId?: number }): Promise<PostBookmarkType[]> =>
    call(() =>
      apiClient
        .get<{ bookmarks: PostBookmarkType[] }>('/bookmarks/posts', {
          params: { limit: params.limit ?? POST_BOOKMARKS_PAGE_SIZE, cursorId: params.cursorId },
        })
        .then((r) => r.data.bookmarks)
    ),
};

function toast(message: string) {
  // The app ships on Android only; elsewhere the menu label flipping is the feedback.
  if (Platform.OS === 'android') ToastAndroid.show(message, ToastAndroid.SHORT);
}

/**
 * Save / un-save a post (ჩამახსოვრება / დავიწყება) from any surface: the ⋯ menus on feed cards,
 * the shuffle deck and the post page, and the ✕ on a row of the list itself.
 *
 * Optimistic: every cached copy of the post flips at once, a failure puts it back and says so,
 * and the list is refetched either way so it settles on what the server holds. A removal also
 * drops its row from the list immediately instead of waiting for that refetch.
 */
export function useBookmarkToggle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, save }: { postId: number; save: boolean }) =>
      save ? bookmarksApi.addPost(postId) : bookmarksApi.removePost(postId),
    onMutate: ({ postId, save }) => {
      syncPostInCaches(queryClient, postId, { userBookmarked: save });
      if (!save) {
        queryClient.setQueriesData<InfiniteData<PostBookmarkType[]>>({ queryKey: POST_BOOKMARKS_KEY }, (data) =>
          data
            ? { ...data, pages: data.pages.map((page) => page.filter((row) => Number(row.postId) !== postId)) }
            : data
        );
      }
    },
    onSuccess: (_data, { save }) => {
      toast(save ? 'ჩამახსოვრებულია' : 'ამოღებულია ჩამახსოვრებულებიდან');
    },
    onError: (err, { postId, save }) => {
      syncPostInCaches(queryClient, postId, { userBookmarked: !save });
      Alert.alert('შეცდომა', err.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: POST_BOOKMARKS_KEY });
    },
  });
}
