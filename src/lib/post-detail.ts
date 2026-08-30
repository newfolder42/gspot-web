"use server";

import { getPostForView, postIsGuessedByUser } from '@/lib/posts';
import { getHideAndSeekGameForUser, getHideAndSeekPlayersForUser } from '@/lib/hideAndSeek';
import { logerror } from '@/lib/logger';
import type { PostDetailType } from '@/types/post-detail';

/**
 * Loads one post for its detail view.
 *
 * `getPostForView` is the access-checked lookup that establishes the post exists and what
 * type it is; everything after it is that type's own payload. Callers get a discriminated
 * union and narrow on `post.type`, so a new post type costs one branch here instead of a
 * new prop threaded through every route and the view.
 *
 * `userId` may be null for an anonymous viewer; public posts still resolve.
 */
export async function getPostDetail(
  userId: number | null,
  postId: number
): Promise<PostDetailType | null> {
  const viewerId = userId ?? 0;
  const post = await getPostForView(viewerId, postId);
  if (!post) return null;

  switch (post.type) {
    case 'gps-photo': {
      const alreadyGuessed = userId ? await postIsGuessedByUser(postId, userId) : false;
      return { ...post, alreadyGuessed };
    }

    case 'hide-and-seek': {
      const [game, players] = await Promise.all([
        getHideAndSeekGameForUser(viewerId, postId),
        getHideAndSeekPlayersForUser(viewerId, postId),
      ]);

      // A hide-and-seek post with no game row is broken data, not a viewable post —
      // better a 404 than a detail page with an empty panel.
      if (!game) {
        await logerror('getPostDetail: hide-and-seek post has no game row', [postId]);
        return null;
      }

      return { ...post, game, players };
    }

    default:
      return post;
  }
}
