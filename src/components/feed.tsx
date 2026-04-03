'use client';

import { useState } from 'react';
import FeedClient from "./feed-client";
import { FeedFilter, FeedType, GpsPostType } from '@/types/post';

type FeedProps = {
  userId?: number | null;
  accountUserId?: number;
  type: FeedType;
  zoneId?: number | null,
  initialPosts: GpsPostType[];
  showFilter?: boolean;
};

export default function Feed({ userId, accountUserId, type, zoneId, initialPosts, showFilter = true }: FeedProps) {
  const [filter, setFilter] = useState<FeedFilter>('all');

  return (
    <div className="max-w-4xl mx-auto">
      {showFilter && userId && (
        <div className="mb-4 border-b border-zinc-200 dark:border-zinc-800 pb-2">
          <div className="flex items-center gap-3">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as FeedFilter)}
              className="px-3 py-2 rounded-md text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">ყველა</option>
              <option value="guessed">გამოცნობილი</option>
              <option value="not-guessed">გამოსაცნობი</option>
            </select>
          </div>
        </div>
      )}
      <FeedClient
        initialPosts={initialPosts}
        userId={userId}
        accountUserId={accountUserId}
        type={type}
        zoneId={zoneId!}
        filter={filter}
      />
    </div>
  );
}
