"use client"

import React, { useState } from 'react';
import { followUnfollow } from '@/lib/followActions';

type Props = {
    alias: string;
    initialConnected?: boolean;
};


export default function FollowButton({ alias, initialConnected = false }: Props) {
    const [connected, setConnected] = useState(Boolean(initialConnected));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleFollow(e: React.MouseEvent) {
        e.preventDefault();
        if (loading) return;
        setLoading(true);
        setError(null);
        try {
            const result = await followUnfollow(alias, connected);
            if (result.success) {
                setConnected(!connected);
            } else {
                setError('ფიქსირდება ხარვეზი, გთხვოთ ცადოს მოგვაინებით:' + result.error);
            }
        } catch (err) {
            setError('ფიქსირდება ხარვეზი, გთხვოთ ცადოს მოგვაინებით');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="mt-3">
            <button
                onClick={handleFollow}
                disabled={loading}
                className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm transition ${loading ? 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
            >
                {loading ? 'მიმდინარეობს...' : connected ? 'გამოწერის გაუქმება' : 'გამოწერა'}
            </button>
            {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        </div>
    );
}
