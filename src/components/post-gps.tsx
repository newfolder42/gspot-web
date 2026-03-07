import Image from "next/image";
import Link from "next/link";
import PostActions from "./post-actions";
import type { GpsPostType } from "@/types/post";
import { formatActionDate, formatPhotoTakenDate } from "@/lib/dates";
import { useState } from "react";

export function GpsPost({ post }: { post: GpsPostType }) {

  const [isPortrait, setIsPortrait] = useState(false);

  return (
    <article className="border-b border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <div className="flex items-start p-2">
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <Link href={`/account/${post.author}`} className="font-semibold text-zinc-900 dark:text-zinc-50 hover:underline">&apos;{post.author}</Link>
            <time className="text-xs text-zinc-400">{formatActionDate(post.date)}</time>
            {post.status === 'failed' && (
              <svg
                className="w-3 h-3 text-rose-600"
                viewBox="0 0 12 12"
                aria-label="Post failed"
                role="img"
              >
                <circle cx="6" cy="6" r="5.5" fill="currentColor" />
              </svg>
            )}
          </div>
          <div className="text-sm text-zinc-700 dark:text-zinc-300">{post.title}</div>
          {post.dateTaken && (
            <div className="text-sm text-zinc-700 dark:text-zinc-300">
              გადაღებულია: {formatPhotoTakenDate(post.dateTaken)}
            </div>
          )}
        </div>
        <div className="flex-shrink-0">
          <PostActions postAuthor={post.author} postId={post.id} currentTitle={post.title} />
        </div>
      </div>
      <Link href={`/post/${post.id}`} className="block w-full">
        <Image
          src={post.image}
          alt={post.title || `'${post.author}-მომხმარებლის სურათი`}
          width={1200}
          height={800}
          className={`w-full ${isPortrait ? 'h-[60vh]' : 'h-auto max-h-[60vh]'} object-contain transition-all`}
          onLoad={(e) => {
            const target = e.target as HTMLImageElement;
            setIsPortrait(target.naturalHeight > target.naturalWidth);
          }}
          priority={false}
        />
      </Link>

      <div className="px-4 py-3 flex items-center justify-between">
        <Link href={`/post/${post.id}#guesses`} className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300" title="გამოცნობების ნახვა">
          <svg className="w-5 h-5 text-zinc-500 dark:text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span className="font-medium">{post.guessCount ?? '0'}</span>
        </Link>
      </div>
    </article>
  );
}
