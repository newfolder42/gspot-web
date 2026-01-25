import Image from "next/image";
import Link from "next/link";
import PostActions from "./post-actions";
import type { GpsPostType } from "@/types/post";
import { formatActionDate, formatPhotoTakenDate } from "@/lib/dates";

export function GpsPost({ post }: { post: GpsPostType }) {
  return (
    <article key={post.id} className="bg-white dark:bg-zinc-900 rounded-lg shadow border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <Link href={`/account/${post.author}`} className="font-semibold text-zinc-900 dark:text-zinc-50 hover:underline">{post.author}</Link>
            <div className="text-xs text-zinc-400">{formatActionDate(post.date)}</div>
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
        <div className="w-full">
          <Image
            src={post.image}
            alt={post.title || `'${post.author}-მომხმარებლის სურათი`}
            width={1200}
            height={800}
            className="w-full h-full object-cover"
            priority={false}
          />
        </div>
      </Link>
    </article>
  );
}
