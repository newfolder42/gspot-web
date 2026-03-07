'use client';

import { useState } from 'react';
import { loadPosts, FeedFilter } from "@/actions/feed";
import CreatePost from "./post-create";
import FeedClient from "./feed-client";
import { GpsPostType } from '@/types/post';

type FeedProps = {
  userId: number;
  accountUserId?: number;
  type: "account-feed" | "global-feed" | "connections-feed";
  initialPosts: GpsPostType[];
  showFilter?: boolean;
};

export default function Feed({ userId, accountUserId, type, initialPosts, showFilter = true }: FeedProps) {
  const [filter, setFilter] = useState<FeedFilter>('all');
  const isViewingOwnAccount = type === 'account-feed' && accountUserId && userId === accountUserId;
  const isLoggedIn = Boolean(userId);
  const showCreate = Boolean(isLoggedIn && (type !== 'account-feed' || isViewingOwnAccount));

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4 border-b border-zinc-200 dark:border-zinc-800 pb-2">
        <div className="flex items-center gap-3">
          {showCreate && <CreatePost />}
          {showFilter && (
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as FeedFilter)}
              className="px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-md text-sm bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">ყველა</option>
              <option value="guessed">გამოცნობილი</option>
              <option value="not-guessed">გამოსაცნობი</option>
            </select>
          )}
        </div>
      </div>
      <FeedClient 
        initialPosts={initialPosts} 
        userId={userId}
        accountUserId={accountUserId}
        type={type}
        filter={filter}
      />
    </div>
  );
}
