"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { loadPostBookmarksAction, setPostBookmarkAction } from "@/actions/bookmarks";
import { CheckmarkCircleIcon, EyeIcon, FlagIcon, ImageIcon, XIcon } from "@/components/icons";
import { POST_BOOKMARKS_PAGE_SIZE, type PostBookmarkType } from "@/types/bookmark";

/** What names the row: the post's title, or what kind of post it is when it has none. */
function rowTitle(row: PostBookmarkType): string {
  if (row.type === "quest-completion") {
    return row.questTitle ? `შეასრულა მისია "${row.questTitle}"` : "შეასრულა მისია";
  }
  if (row.title) return row.title;
  return row.type === "hide-and-seek" ? "დამალობანა" : "პოსტი";
}

function PlaceholderIcon({ type }: { type: PostBookmarkType["type"] }) {
  const className = "w-6 h-6 text-zinc-300 dark:text-zinc-600";
  if (type === "quest-completion") return <FlagIcon className={className} />;
  if (type === "hide-and-seek") return <EyeIcon className={className} />;
  return <ImageIcon className={className} />;
}

/**
 * ჩამახსოვრებულები: the posts the user saved, newest first, as a plain list. Each row is just
 * enough to recognise the post and open it; nothing says where it is, since a distance would
 * give away the answer to a post that is still waiting to be guessed.
 */
export default function BookmarksList({ initial }: { initial: PostBookmarkType[] }) {
  const [rows, setRows] = useState<PostBookmarkType[]>(initial);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initial.length === POST_BOOKMARKS_PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // The page cursor is the last bookmark the server sent, which a removal must not move.
  const cursorRef = useRef<number | undefined>(initial[initial.length - 1]?.id);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const batch = await loadPostBookmarksAction(cursorRef.current);
      if (batch.length > 0) cursorRef.current = batch[batch.length - 1].id;
      setRows((prev) => {
        const seen = new Set(prev.map((r) => r.id));
        return [...prev, ...batch.filter((r) => !seen.has(r.id))];
      });
      if (batch.length < POST_BOOKMARKS_PAGE_SIZE) setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  const handleRemove = async (row: PostBookmarkType) => {
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    const ok = await setPostBookmarkAction(row.postId, false).catch(() => false);
    // Put it back where it was: the list is ordered by bookmark id.
    if (!ok) setRows((prev) => [...prev, row].sort((a, b) => b.id - a.id));
  };

  return (
    <div className="max-w-2xl mx-auto px-2 py-4">
      <h1 className="mb-4 px-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">ჩამახსოვრებულები</h1>

      <div className="rounded-lg bg-white dark:bg-zinc-900 ring-1 ring-zinc-100 dark:ring-zinc-800 overflow-hidden">
        {rows.length === 0 && !loading ? (
          <div className="text-center px-4 py-12">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">ჩამახსოვრებული პოსტები არ გაქვს</p>
            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">პოსტის ⋯ მენიუდან შეგიძლია ჩაიმახსოვრო</p>
          </div>
        ) : (
          <ul>
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex items-center gap-3 px-3 py-2.5 border-b border-zinc-100 dark:border-zinc-800 last:border-b-0"
              >
                <Link
                  href={`/post/${row.postId}`}
                  className="flex flex-1 min-w-0 items-center gap-3 hover:opacity-80"
                >
                  <div className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                    {row.thumbnail ? (
                      <Image src={row.thumbnail} alt="" fill sizes="56px" className="object-cover" />
                    ) : (
                      <PlaceholderIcon type={row.type} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold text-zinc-800 dark:text-zinc-100">{rowTitle(row)}</p>
                    <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                      {row.zoneSlug} • &apos;{row.author}
                    </p>
                    {row.userHasGuessed && (
                      <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-teal-600 dark:text-teal-400">
                        <CheckmarkCircleIcon className="h-3 w-3" />
                        გამოცნობილია
                      </p>
                    )}
                  </div>
                </Link>
                <button
                  onClick={() => handleRemove(row)}
                  aria-label="დავიწყება"
                  title="დავიწყება"
                  className="flex-shrink-0 rounded-md p-2 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Sentinel for infinite scroll */}
      {hasMore && <div ref={sentinelRef} className="h-4" />}
    </div>
  );
}
