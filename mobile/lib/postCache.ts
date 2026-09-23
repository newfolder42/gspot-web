import type { QueryClient } from '@tanstack/react-query';
import type { MobilePostType, PostDetailResponse } from '@/types/post';

type PostPatch = Partial<
  Pick<MobilePostType, 'voteScore' | 'userVote' | 'rewards' | 'userReward' | 'commentCount' | 'guessCount' | 'userHasGuessed'>
>;

/**
 * Infinite queries that hold post lists. FeedList pages are plain arrays; the zone
 * feed's pages are `{ posts, tags }`.
 */
const POST_LIST_KEYS = ['global-feed', 'to-guess-feed', 'zone-feed', 'account-posts'] as const;

type Pages = { pages: unknown[]; pageParams: unknown[] };

function patchList(posts: MobilePostType[], postId: number, patch: (post: MobilePostType) => PostPatch) {
  return posts.map((post) => (Number(post.id) === postId ? { ...post, ...patch(post) } : post));
}

function patchPages(data: Pages | undefined, postId: number, patch: (post: MobilePostType) => PostPatch) {
  if (!data?.pages) return data;
  return {
    ...data,
    pages: data.pages.map((page) => {
      if (Array.isArray(page)) return patchList(page, postId, patch);
      const posts = (page as { posts?: MobilePostType[] } | null)?.posts;
      return Array.isArray(posts) ? { ...(page as object), posts: patchList(posts, postId, patch) } : page;
    }),
  };
}

/**
 * Carries a post's new counts into every cached copy of it, so a vote in the feed
 * shows on the post page and a comment on the post page shows back in the feed
 * without waiting for a refetch.
 */
export function syncPostInCaches(
  queryClient: QueryClient,
  postId: number,
  patch: PostPatch | ((post: MobilePostType) => PostPatch)
) {
  // Post ids are bigints and arrive from the API as strings; the cache keys use numbers.
  const id = Number(postId);
  const apply = typeof patch === 'function' ? patch : () => patch;

  for (const key of POST_LIST_KEYS) {
    queryClient.setQueriesData<Pages>({ queryKey: [key] }, (data) => patchPages(data, id, apply));
  }

  queryClient.setQueryData<PostDetailResponse>(['post-detail', id], (data) => {
    if (!data) return data;
    const next = apply(data.post);
    return {
      ...data,
      post: { ...data.post, ...next },
      votes: {
        score: next.voteScore ?? data.votes.score,
        userVote: next.userVote !== undefined ? next.userVote : data.votes.userVote,
      },
      rewards: {
        rewards: next.rewards ?? data.rewards.rewards,
        userReward: next.userReward !== undefined ? next.userReward : data.rewards.userReward,
      },
    };
  });
}
