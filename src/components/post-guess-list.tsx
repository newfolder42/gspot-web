"use client";
import { useState, useEffect } from 'react';
import { useRef } from 'react';
import PostGuess from './post-guess';
import { createPostGuess, getPostGuesses } from '@/lib/posts';

type PostGuess = {
    id: number;
    postId: number;
    userId?: number | null;
    author?: string | null;
    score?: number | null;
    created_at: string;
};

export default function PostGuessList({ postId }: { postId: number }) {
    const [guesses, setGuesses] = useState<PostGuess[]>([]);
    const [loading, setLoading] = useState(false);
    const [guessText, setGuessText] = useState('');
    const [score, setScore] = useState<number | null>(null);
    const [selectedCoords, setSelectedCoords] = useState<{ latitude: number; longitude: number } | null>(null);

    const fetchGuesses = async () => {
        setLoading(true);
        const guesses = await getPostGuesses(postId);
        setGuesses(guesses || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchGuesses();
    }, [postId]);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createPostGuess({ postId, coordinates: selectedCoords, score });
            setGuessText('');
            setScore(null);
            setSelectedCoords(null);
            fetchGuesses();
        } catch (err) {
            alert('Failed to post guess');
        }
    };

    return (
        <div className="mt-6">
            <div className="mt-4 space-y-3">
                {loading ? (
                    <div>Loading...</div>
                ) : (
                    guesses.map((c) => (
                        <PostGuess key={c.id} guess={c} />
                    ))
                )}
            </div>

            <form onSubmit={submit} className="mt-4 grid gap-2">
                <textarea value={guessText} onChange={(e) => setGuessText(e.target.value)} placeholder="Your guess..." rows={3} className="rounded-md border border-zinc-200 dark:border-zinc-700 px-3 py-2 bg-white dark:bg-zinc-800 text-sm" />
                <input value={score === null ? '' : String(score)} onChange={(e) => setScore(e.target.value === '' ? null : Number(e.target.value))} placeholder="Score" className="rounded-md border border-zinc-200 dark:border-zinc-700 px-3 py-2 bg-white dark:bg-zinc-800 text-sm" />
                <div>
                    <button type="submit" className="px-4 py-2 rounded-md bg-blue-600 text-white">Submit Guess</button>
                </div>
            </form>
        </div>
    );
}
