"use client";

export type PostGuess = {
    id: number;
    postId: number;
    userId?: number | null;
    author?: string | null;
    score?: number | null;
    created_at: string;
};

export default function PostGuess({ guess }: { guess: PostGuess }) {
    return (
        <div className="p-3 bg-white dark:bg-zinc-900 rounded border border-zinc-200 dark:border-zinc-700">
            <div className="flex items-baseline justify-between gap-3">
                <div className="text-sm font-medium">{guess.author || 'Anonymous'}</div>
                <div className="text-xs text-zinc-400">{new Date(guess.created_at).toLocaleString()}</div>
            </div>
            {typeof guess.score === 'number' && <div className="mt-2 text-xs text-zinc-600">Score: <strong>{guess.score}</strong></div>}
        </div>
    );
}
