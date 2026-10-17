"use client";

import { useEffect, useRef, useState } from 'react';
import { BookmarkIcon } from '@/components/icons';
import { usePostBookmark } from './use-post-bookmark';

/**
 * The ⋯ menu on a feed card. Saving a post to ჩამახსოვრებულები is its only entry for now; the
 * post page has its own ⋯ (see PostActions) with this item among the others. Render it for
 * signed-in viewers only.
 */
export default function PostBookmarkMenu({
  postId,
  initialBookmarked,
}: {
  postId: number;
  initialBookmarked: boolean;
}) {
  const { bookmarked, toggle } = usePostBookmark(postId, initialBookmarked);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  return (
    <div ref={ref} className="relative inline-flex items-center gap-1">
      {bookmarked && (
        <BookmarkIcon filled className="h-4 w-4 text-teal-600 dark:text-teal-400" />
      )}
      <button
        aria-label="Post options"
        onClick={() => setOpen((s) => !s)}
        className="rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-zinc-600 dark:text-zinc-300" viewBox="0 0 20 20" fill="currentColor">
          <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-layer-context w-40 overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md shadow-lg">
          <button
            onClick={() => {
              setOpen(false);
              toggle();
            }}
            className="w-full text-left px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
          >
            {bookmarked ? 'დავიწყება' : 'ჩამახსოვრება'}
          </button>
        </div>
      )}
    </div>
  );
}
