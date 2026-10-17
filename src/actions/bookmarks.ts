"use server";

import { getCurrentUser } from '@/lib/session';
import { addPostBookmark, getPostBookmarks, removePostBookmark } from '@/lib/bookmarks';
import { POST_BOOKMARKS_PAGE_SIZE, type PostBookmarkType } from '@/types/bookmark';

/** Saves (`saved`) or un-saves a post for the signed-in user. True when the list now says so. */
export async function setPostBookmarkAction(postId: number, saved: boolean): Promise<boolean> {
  // Post ids are bigints, which pg returns as strings, so what reaches here may be "346".
  const id = Number(postId);
  if (!Number.isInteger(id) || id <= 0) return false;

  const user = await getCurrentUser();
  if (!user) return false;

  if (saved) return (await addPostBookmark(user.userId, id)) === 'ok';
  return removePostBookmark(user.userId, id);
}

/** The next page of the signed-in user's saved posts; `cursorId` is the last id of the page before. */
export async function loadPostBookmarksAction(cursorId?: number): Promise<PostBookmarkType[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const parsed = Number(cursorId);
  const cursor = Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
  return getPostBookmarks(user.userId, POST_BOOKMARKS_PAGE_SIZE, cursor);
}
