'use server';

import { getAccountPosts, getConnectionsPosts, getGlobalPosts, getPublicPosts, getToGuessPosts, getZonePosts } from '@/lib/posts';
import { POSTS_PER_PAGE } from '@/types/constants';
import { FeedFilter, FeedType, FeedPostType, GpsPostType } from '@/types/post';

type LoadPostsParams = {
  type: FeedType;
  userId?: number | null;
  zoneId?: number | null;
  accountUserId?: number;
  cursor?: { date: string; id: number; ids: number[] };
  filter?: FeedFilter;
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
  type: 'to-guess';
  userId?: number | null;
  cursor?: { date: string; id: number };
  limit?: number;
};

type LoadZonePostsParams = {
  zoneId: number;
  userId?: number | null;
  cursor?: { date: string; id: number };
  filter?: FeedFilter;
  tagId?: number | null;
  limit?: number;
}

type LoadPublicPostsParams = {
  cursor?: { ids: number[] };
  limit?: number;
}

export async function loadPosts(params: LoadPostsParams): Promise<FeedPostType[]> {
  const limit = params.limit ? params.limit : POSTS_PER_PAGE;
  switch (params.type) {
    case 'connection':
      return await getConnectionsPosts(params.accountUserId!, params.userId, limit, params.cursor, params.filter);
    case 'account':
      return await getAccountPosts(params.accountUserId!, params.userId, limit, params.cursor, params.filter);
    case 'global':
      return await getGlobalPosts(params.userId, limit, params.cursor, params.filter);
    case 'to-guess':
      return await getToGuessPosts(params.userId!, limit, params.cursor);
    default:
      return [];
  }
}

export async function loadZonePosts(params: LoadZonePostsParams): Promise<FeedPostType[]> {
  const limit = params.limit ? params.limit : POSTS_PER_PAGE;
  return await getZonePosts(params.zoneId!, params.userId, limit, params.cursor, params.filter, params.tagId);
}

export async function loadPublicPosts(params: LoadPublicPostsParams = {}): Promise<GpsPostType[]> {
  const limit = params.limit ? params.limit : POSTS_PER_PAGE;
  return await getPublicPosts(limit, params.cursor);
}
