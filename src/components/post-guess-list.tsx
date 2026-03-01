"use client"

import { useState, useEffect, useCallback } from 'react';
import PostGuess from './post-guess';
import { getPostGuesses, postIsGuessedByUser, canUserGuessPost } from '@/lib/posts';
import PostGuessSkeleton from './post-guess-skeleton';
import { getCurrentUser } from '@/lib/session';
import type { PostGuessType } from '@/types/post-guess';
import type { GpsPostType } from '@/types/post';

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
  const userCanGuess = user ? await postIsGuessedByUser(postId, user.userId) : false;
  const guesses = await getPostGuesses(postId);

  return { isAuthor, userCanGuess, guesses };
};

export default function PostGuessList({ 
  postId, 
  postAuthor, 
  setShowGuessModal,
  setOnGuessSubmitted
}: { 
  postId: number; 
  postAuthor: string; 
  setShowGuessModal?: (show: boolean) => void;
  setOnGuessSubmitted?: (callback: () => void) => void;
}) {
  const [guesses, setGuesses] = useState<PostGuessType[]>([]);
  const [canGuess, setCanGuess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGuessClick = async () => {
    setErrorMessage(null);
    const result = await canUserGuessPost(postId);
    
    if (!result.canGuess) {
      if (result.reason === 'already_guessed') {
        setErrorMessage('თქვენ უკვე გამოიცანით ეს ფოტო');
        setCanGuess(false);
      } else if (result.reason === 'is_author') {
        setErrorMessage('თქვენ ვერ გამოიცნობთ საკუთარ ფოტოს');
        setCanGuess(false);
      } else if (result.reason === 'not_logged_in') {
        setErrorMessage('გაიარეთ ავტორიზაცია');
      } else {
        setErrorMessage('დაფიქსირდა შეცდომა');
      }
      return;
    }
    
    setShowGuessModal?.(true);
  };

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
    setShowGuessModal?.(false);
    setLoading(true);
    const { isAuthor, userCanGuess, guesses } = await loadGuessesData(postId, postAuthor);

    setCanGuess(!isAuthor && userCanGuess);
    setGuesses(guesses);
    setLoading(false);
  }, [postId, postAuthor, setShowGuessModal]);

  useEffect(() => {
    if (setOnGuessSubmitted) {
      setOnGuessSubmitted(() => onSubmitted);
    }
  }, [onSubmitted, setOnGuessSubmitted]);

  return (
    <div className="mt-4">
      {canGuess && (
        <>
          <div className="mt-4">
            <button
              type="button"
              className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition"
              onClick={handleGuessClick}
            >
              სცადე
            </button>
          </div>
          {errorMessage && (
            <div className="mt-2 text-sm text-red-600 dark:text-red-400">
              {errorMessage}
            </div>
          )}
        </>
      )}

      <div className="space-y-2">
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
