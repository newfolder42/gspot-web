'use server';

import { getAccountPosts, getConnectionsPosts, getGlobalPosts, getZonePosts } from '@/lib/posts';
import { POSTS_PER_PAGE } from '@/lib/constants';
import { GpsPostType } from '@/types/post';

export type FeedFilter = 'all' | 'guessed' | 'not-guessed';

type LoadPostsParams = {
  type: 'account-feed' | 'global-feed' | 'connections-feed' | 'zone-feed';
  userId?: number | null;
  zoneId?: number;
  accountUserId?: number;
  cursor?: { date: string; id: number };
  filter?: FeedFilter;
} | {
  type: 'global-feed';
  userId?: number | null;
  cursor?: { date: string; id: number };
  filter?: FeedFilter;
} | {
  type: 'account-feed' | 'connections-feed';
  userId?: number | null;
  accountUserId: number;
  cursor?: { date: string; id: number };
  filter?: FeedFilter;
} | {
  type: 'zone-feed';
  zoneId: number;
  userId?: number | null;
  cursor?: { date: string; id: number };
  filter?: FeedFilter;
};

export async function loadPosts(params: LoadPostsParams): Promise<GpsPostType[]> {
  switch (params.type) {
    case 'connections-feed':
      return await getConnectionsPosts(params.accountUserId!, params.userId, POSTS_PER_PAGE, params.cursor, params.filter);
    case 'account-feed':
      return await getAccountPosts(params.accountUserId!, params.userId, POSTS_PER_PAGE, params.cursor, params.filter);
    case 'global-feed':
      return await getGlobalPosts(params.userId, POSTS_PER_PAGE, params.cursor, params.filter);
    case 'zone-feed':
      return await getZonePosts(params.zoneId!, params.userId, POSTS_PER_PAGE, params.cursor, params.filter);
  }
}
