"use client"

import { useState } from 'react';
import PostGuess from './post-guess';
import SortButtons, { type SortType } from './common/sort-buttons';
import type { PostGuessType } from '@/types/post-guess';

type PostGuess = {
  id: number;
  postId: number;
  userId?: number | null;
  author?: string | null;
  type?: string | null;
  score?: number | null;
};

export default function PostGuessList({ guesses }: { guesses: PostGuessType[] }) {
  const [sortType, setSortType] = useState<SortType>("date");

  const sortedGuesses = [...guesses].sort((a, b) => {
    if (sortType === "date") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else {
      const distanceA = a.distance ?? Infinity;
      const distanceB = b.distance ?? Infinity;
      return distanceA - distanceB;
    }
  });

  return (
    <div className="mt-4 bg-white dark:bg-zinc-900 rounded-md border border-zinc-200 dark:border-zinc-800">
      <div className="px-4 py-2 border-b border-zinc-200 dark:border-zinc-800">
        <SortButtons sortType={sortType} onSortChange={setSortType} />
      </div>
      <div className="p-4 space-y-2">
        {sortedGuesses.map((guess) => (
          <PostGuess key={guess.id} guess={guess} />
        ))}
      </div>
    </div>
  );
}
