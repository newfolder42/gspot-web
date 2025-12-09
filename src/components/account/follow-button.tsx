"use client"

import React, { useState } from 'react';
import { followUnfollow } from '@/lib/followActions';

type Props = {
  alias: string;
  initialConnected?: boolean;
};

const PersonAddSvg = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
    <path d="M8 16A8 8 0 1 1 8 0a8 8 0 0 1 0 16Zm3.78-9.72a.751.751 0 0 0-.018-1.042.751.751 0 0 0-1.042-.018L6.75 9.19 5.28 7.72a.751.751 0 0 0-1.042.018.751.751 0 0 0-.018 1.042l2 2a.75.75 0 0 0 1.06 0Z"></path>
  </svg>
);

const PersonCheckSvg = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
    <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
  </svg>
);

const LoadingSvg = () => (
  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" strokeWidth="2" strokeDasharray="15.7 47.1" />
  </svg>
);

export default function FollowButton({ alias, initialConnected = false }: Props) {
  const [connected, setConnected] = useState(Boolean(initialConnected));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFollow(e: React.MouseEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);

    const result = await followUnfollow(alias, connected);
    if (result.success) {
      setConnected(!connected);
    } else {
      setError('ფიქსირდება ხარვეზი, გთხვოთ ცადოს მოგვაინებით:' + result.error);
    }

    setLoading(false);
  }

  return (
    <div className="">
      <button
        onClick={handleFollow}
        disabled={loading}
        className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm transition ${loading
          ? 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200'
          : connected
            ? 'bg-red-600 text-white hover:bg-red-700'
            : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
      >
        {loading && <LoadingSvg />}
        {!loading && !connected && <PersonAddSvg />}
        {!loading && connected && <PersonCheckSvg />}
      </button>
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  );
}
