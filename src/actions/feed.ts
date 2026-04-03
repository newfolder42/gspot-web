'use server';

import { getAccountPosts, getConnectionsPosts, getGlobalPosts, getPublicPosts, getZonePosts } from '@/lib/posts';
import { POSTS_PER_PAGE } from '@/types/constants';
import { FeedFilter, FeedType, GpsPostType } from '@/types/post';

type LoadPostsParams = {
  type: FeedType;
  userId?: number | null;
  zoneId?: number;
  accountUserId?: number;
  cursor?: { guessCount: number, date: string; id: number, shownCount: number };
  filter?: FeedFilter;
} | {
  type: 'public';
  cursor?: { guessCount: number, id: number, shownCount: number };
} | {
  type: 'global';
  userId?: number | null;
  cursor?: { date: string; id: number };
  filter?: FeedFilter;
} | {
  type: 'account' | 'connection';
  userId?: number | null;
  accountUserId: number;
  cursor?: { date: string; id: number };
  filter?: FeedFilter;
} | {
  type: 'zone';
  zoneId: number;
  userId?: number | null;
  cursor?: { date: string; id: number };
  filter?: FeedFilter;
};

export async function loadPosts(params: LoadPostsParams): Promise<GpsPostType[]> {
  switch (params.type) {
    case 'connection':
      return await getConnectionsPosts(params.accountUserId!, params.userId, POSTS_PER_PAGE, params.cursor, params.filter);
    case 'account':
      return await getAccountPosts(params.accountUserId!, params.userId, POSTS_PER_PAGE, params.cursor, params.filter);
    case 'global':
      return await getGlobalPosts(params.userId, POSTS_PER_PAGE, params.cursor, params.filter);
    case 'zone':
      return await getZonePosts(params.zoneId!, params.userId, POSTS_PER_PAGE, params.cursor, params.filter);
    case 'public':
    default:
      return await getPublicPosts(10, POSTS_PER_PAGE, params.cursor);
  }
}
