"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import PostActions from './post-actions';
import PostGuessList from './post-guess-list';
import type { GpsPostType } from '@/types/post';
import { formatActionDate, formatPhotoTakenDate } from '@/lib/dates';
import type { PostGuessType } from '@/types/post-guess';

type PostDetailClientProps = {
  post: GpsPostType;
  guesses: PostGuessType[];
  currentUser: string;
  alreadyGuessed: boolean;
};

export default function PostDetailClient({ post, guesses, currentUser, alreadyGuessed }: PostDetailClientProps) {
  const isAuthor = currentUser === post.author;
  const userCanGuess = !!currentUser && !isAuthor && !alreadyGuessed;

  const [isPortrait, setIsPortrait] = useState(false);
  const [canGuess, setCanGuess] = useState(userCanGuess);
  const [guessesList, setGuessesList] = useState<PostGuessType[]>(guesses);
  const [guessCount, setGuessCount] = useState(Number(post.guessCount) || 0);

  const handleGuessSubmitted = (newGuess: PostGuessType) => {
    setCanGuess(false);
    setGuessesList(prev => [newGuess, ...prev]);
    setGuessCount(prev => prev + 1);
  };

  return (
    <main className="max-w-4xl mx-auto my-auto px-2 py-2 md:py-4">
      <article className="">
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

        {post.image && (
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
          />
        )}
      </article>

      <div id="guesses">
        <PostGuessList
          guesses={guessesList}
          isAuthor={isAuthor}
          postId={post.id}
          guessCount={guessCount}
          canGuess={canGuess}
          postImage={post.image}
          postTitle={post.title || ''}
          onGuessSubmitted={handleGuessSubmitted}
        />
      </div>
    </main>
  );
}
