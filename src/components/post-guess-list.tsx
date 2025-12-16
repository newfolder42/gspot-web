"use client"

import { useState, useEffect, useCallback } from 'react';
import PostGuess from './post-guess';
import { getPostGuesses, postIsGuessedByUser } from '@/lib/posts';
import PostGuessSkeleton from './post-guess-skeleton';
import NewGuess from './new-guess';
import { getCurrentUser } from '@/lib/session';
import type { PostGuessType } from '@/types/post-guess';

type PostGuess = {
  id: number;
  postId: number;
  userId?: number | null;
  author?: string | null;
  type?: string | null;
  score?: number | null;
};

const loadGuessesData = async (postId: number, postAuthor: string) => {
  const user = await getCurrentUser();
  const isAuthor = user?.alias === postAuthor;
  const userCanGuess = user ? await postIsGuessedByUser(postId, user.userId) : true;
  const guesses = await getPostGuesses(postId);
  
  return { isAuthor, userCanGuess, guesses };
};

export default function PostGuessList({ postId, postAuthor }: { postId: number; postAuthor: string }) {
  const [guesses, setGuesses] = useState<PostGuessType[]>([]);
  const [canGuess, setCanGuess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const loadGuesses = async () => {
      setLoading(true);
      const { isAuthor, userCanGuess, guesses } = await loadGuessesData(postId, postAuthor);
      
      setCanGuess(!isAuthor && userCanGuess);
      setGuesses(guesses);
      setLoading(false);
    };

    loadGuesses();
  }, [postId, postAuthor]);

  const onSubmitted = useCallback(async () => {
    setShowForm(false);
    setLoading(true);
    const { isAuthor, userCanGuess, guesses } = await loadGuessesData(postId, postAuthor);
    
    setCanGuess(!isAuthor && userCanGuess);
    setGuesses(guesses);
    setLoading(false);
  }, [postId, postAuthor]);

  return (
    <div className="mt-6">
      {canGuess && (
        showForm ? (
          <NewGuess postId={postId} onSubmitted={onSubmitted} />
        ) : (
          <div className="mt-4">
            <button
              type="button"
              className="px-4 py-2 rounded-md bg-blue-600 text-white"
              onClick={() => setShowForm(true)}
            >
              სცადე
            </button>
          </div>
        )
      )}

      <div className="mt-4 space-y-3">
        {loading ? (
          [1, 2, 3].map((c) => (
            <PostGuessSkeleton key={c} />
          ))
        ) : (
          guesses.map((c) => (
            <PostGuess key={c.id} guess={c} />
          ))
        )}
      </div>
    </div>
  );
}
