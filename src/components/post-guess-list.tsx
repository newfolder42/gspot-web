"use client"

import PostGuess from './post-guess';
import type { PostGuessType } from '@/types/post-guess';

type PostGuess = {
  id: number;
  postId: number;
  userId?: number | null;
  author?: string | null;
  type?: string | null;
  score?: number | null;
};

export default function PostGuessList({guesses}: {guesses: PostGuessType[]} ) {

  return (
    <div className="mt-4">
      <div className="space-y-2">
        {(
          guesses.map((guess) => (
            <PostGuess key={guess.id} guess={guess} />
          ))
        )}
      </div>
    </div>
  );
}
