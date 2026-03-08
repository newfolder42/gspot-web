import Image from "next/image";
import Link from "next/link";
import PostActions from "./post-actions";
import type { GpsPostType } from "@/types/post";
import { formatActionDate, formatPhotoTakenDate } from "@/lib/dates";
import { useState } from "react";
import { MapPinIcon } from "./icons";

export function GpsPost({ post }: { post: GpsPostType }) {

  const [isPortrait, setIsPortrait] = useState(false);

  return (
    <article className="overflow-hidden">
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
      <div className="relative">
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
        <Link
          href={`/post/${post.id}#guesses`}
          className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-zinc-900/80 text-zinc-50 backdrop-blur-sm px-2.5 py-1 border border-zinc-100/20 hover:bg-zinc-900/90 transition"
          title="გამოცნობების ნახვა"
          aria-label="გამოცნობების ნახვა"
        >
          <MapPinIcon className="w-4 h-4" />
          <span className="text-sm font-semibold">{post.guessCount ?? '0'}</span>
        </Link>
      </div>
    </article>
  );
}
