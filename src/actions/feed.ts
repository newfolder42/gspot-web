'use server';

import { getAccountPosts, getConnectionsPosts, getGlobalPosts, getPublicPosts, getZonePosts } from '@/lib/posts';
import { POSTS_PER_PAGE } from '@/types/constants';
import { FeedFilter, FeedType, GpsPostType } from '@/types/post';

type LoadPostsParams = {
  type: FeedType;
  userId?: number | null;
  zoneId?: number | null;
  accountUserId?: number;
  cursor?: { guessCount: number, date: string; id: number, shownCount: number };
  filter?: FeedFilter;
  tagId?: number | null;
  limit?: number;
} | {
  type: 'public';
  cursor?: { guessCount: number, id: number, shownCount: number };
  limit?: number;
} | {
  type: 'global';
  userId?: number | null;
  cursor?: { date: string; id: number };
  filter?: FeedFilter;
  limit?: number;
} | {
  type: 'account' | 'connection';
  userId?: number | null;
  accountUserId: number;
  cursor?: { date: string; id: number };
  filter?: FeedFilter;
  limit?: number;
} | {
  type: 'zone';
  zoneId: number;
  userId?: number | null;
  cursor?: { date: string; id: number };
  filter?: FeedFilter;
  tagId?: number | null;
  limit?: number;
};

export async function loadPosts(params: LoadPostsParams): Promise<GpsPostType[]> {
  const limit = params.limit ? params.limit : POSTS_PER_PAGE;
  switch (params.type) {
    case 'connection':
      return await getConnectionsPosts(params.accountUserId!, params.userId, limit, params.cursor, params.filter);
    case 'account':
      return await getAccountPosts(params.accountUserId!, params.userId, limit, params.cursor, params.filter);
    case 'global':
      return await getGlobalPosts(params.userId, limit, params.cursor, params.filter);
    case 'zone':
      return await getZonePosts(params.zoneId!, params.userId, limit, params.cursor, params.filter, params.tagId);
    case 'public':
    default:
      return await getPublicPosts(10, limit, params.cursor);
  }
}
