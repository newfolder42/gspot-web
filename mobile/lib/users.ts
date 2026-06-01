import { apiClient } from '@/lib/api';
import type { MobilePostType } from '@/types/post';

export type PublicUserProfile = {
  user: { id: number; alias: string; age: number | null };
  profilePhoto: { id: number; url: string } | null;
  level: { xp: number; level: number } | null;
  posts: MobilePostType[];
};

export const usersApi = {
  getProfile: (alias: string): Promise<PublicUserProfile> =>
    apiClient
      .get<PublicUserProfile>(`/users/${encodeURIComponent(alias)}`)
      .then((r) => r.data),
};
