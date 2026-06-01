import { apiClient } from '@/lib/api';

export type SearchResults = {
  users: { id: number; alias: string; age: number }[];
  posts: { id: number; title: string; author: string }[];
  zones: { id: number; slug: string; description: string | null; profilePhotoUrl: string | null }[];
};

export type MobileZone = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  profilePhotoUrl: string | null;
  visibility: string;
  joinPolicy: string;
  isMember: boolean;
};

export const searchApi = {
  search: (q: string): Promise<SearchResults> =>
    apiClient.get<SearchResults>('/search', { params: { q } }).then((r) => r.data),

  getZones: (): Promise<{ zones: MobileZone[] }> =>
    apiClient.get<{ zones: MobileZone[] }>('/zones').then((r) => r.data),
};
