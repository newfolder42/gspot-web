"use client";

import { useState } from 'react';
import { setPostBookmarkAction } from '@/actions/bookmarks';

/**
 * Save / un-save one post (ჩამახსოვრება / დავიწყება). Optimistic: the state flips at once and
 * goes back if the server says no, so a menu item can show the new label straight away.
 */
export function usePostBookmark(postId: number, initial: boolean) {
  const [bookmarked, setBookmarked] = useState(initial);
  const [pending, setPending] = useState(false);

  const toggle = async () => {
    if (pending) return;
    const next = !bookmarked;
    setBookmarked(next);
    setPending(true);
    try {
      const ok = await setPostBookmarkAction(postId, next);
      if (!ok) setBookmarked(!next);
    } catch {
      setBookmarked(!next);
    } finally {
      setPending(false);
    }
  };

  return { bookmarked, pending, toggle };
}
