"use client"

import { useState, useEffect } from 'react';
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

export default function PostGuessList({ postId, postAuthor }: { postId: number; postAuthor: string }) {
    const [guesses, setGuesses] = useState<PostGuessType[]>([]);
    const [canGuess, setCanGuess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);

    const fetchGuesses = async () => {
        setLoading(true);

        const user = await getCurrentUser();

        // Don't allow guessing on own posts
        if (user?.alias === postAuthor) {
            setCanGuess(false);
            const guesses = await getPostGuesses(postId);
            setGuesses(guesses);
            setLoading(false);
            return;
        }

        const canGuess = user ? await postIsGuessedByUser(postId, user.userId) : true;
        setCanGuess(canGuess);

        const guesses = await getPostGuesses(postId);
        setGuesses(guesses);

        setLoading(false);
    };

    useEffect(() => {
        fetchGuesses();
    }, [postId]);

    const onSubmitted = () => {
        setShowForm(false);
        fetchGuesses();
    };

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
