'use server';

import { getAccountPosts, getConnectionsPosts, getGlobalPosts } from '@/lib/posts';
import { POSTS_PER_PAGE } from '@/lib/constants';
import { GpsPostType } from '@/types/post';

type LoadPostsParams = {
  type: 'account-feed' | 'global-feed' | 'connections-feed';
  userId: number;
  accountUserId?: number;
  cursor?: { date: string; id: number };
};

export async function loadPosts({
  type,
  userId,
  accountUserId,
  cursor,
}: LoadPostsParams): Promise<GpsPostType[]> {
  switch (type) {
    case 'connections-feed':
      return await getConnectionsPosts(userId, accountUserId!, POSTS_PER_PAGE, cursor);
    case 'account-feed':
      return await getAccountPosts(userId, accountUserId!, POSTS_PER_PAGE, cursor);
    case 'global-feed':
      return await getGlobalPosts(userId, POSTS_PER_PAGE, cursor);
  }
}
