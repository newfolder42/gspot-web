import { apiClient } from '@/lib/api';
import type { MobilePostType } from '@/types/post';

export type ZoneInfo = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  profilePhotoUrl: string | null;
};

export type ZoneTag = {
  id: number;
  name: string;
  color: string;
};

export type ZoneFeedResponse = {
  zone: ZoneInfo;
  tags: ZoneTag[];
  posts: MobilePostType[];
};

export type MobileZoneFeedFilter = 'all' | 'guessed' | 'not-guessed';

export const zonesApi = {
  loadZoneFeed: (
    slug: string,
    params: {
      limit?: number;
      filter?: MobileZoneFeedFilter;
      cursorDate?: string;
      cursorId?: number;
      tagId?: number;
    }
  ): Promise<ZoneFeedResponse> =>
    apiClient
      .get<ZoneFeedResponse>(`/feed/zone/${encodeURIComponent(slug)}`, { params })
      .then((r) => r.data),
};
