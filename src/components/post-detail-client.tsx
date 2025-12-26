"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import PostActions from './post-actions';
import PostGuessList from './post-guess-list';
import type { GpsPostType } from '@/types/post';

export default function PostDetailClient({ post }: { post: GpsPostType }) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-950 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <article className="bg-white dark:bg-zinc-900 rounded-lg shadow border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="flex items-start gap-3 px-4 py-3">
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <Link href={`/account/${post.author}`} className="font-semibold text-zinc-900 dark:text-zinc-50 hover:underline">{post.author}</Link>
                <time className="text-xs text-zinc-400">{new Date(post.date).toLocaleString('ka-GE')}</time>
              </div>
              <div className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">{post.title}</div>
            </div>
            <div className="flex-shrink-0">
              <PostActions postAuthor={post.author} postId={post.id} currentTitle={post.title} />
            </div>
          </div>

          {post.image && (
            <div className="relative group w-full">
              <Image
                src={post.image}
                alt={post.title}
                width={1200}
                height={800}
                className={`w-full ${isFullscreen ? 'max-h-screen' : 'max-h-[60vh]'} object-contain bg-zinc-100 dark:bg-zinc-800 transition-all`}
              />
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="absolute top-4 right-4 p-2 rounded-md bg-black/50 hover:bg-black/70 text-white transition opacity-0 group-hover:opacity-100"
                title={isFullscreen ? 'Exit fullscreen' : 'View fullscreen'}
              >
                {isFullscreen ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                )}
              </button>
            </div>
          )}
        </article>

        <PostGuessList postId={post.id} postAuthor={post.author} />
      </div>
    </main>
  );
}
