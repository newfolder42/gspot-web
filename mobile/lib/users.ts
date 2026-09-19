import { apiClient } from '@/lib/api';
import { uploadToSignedUrl } from '@/lib/upload';
import type { MobilePostType } from '@/types/post';
import type { UserGuess } from '@/types/guess';
import type { AccountAchievement } from '@/types/achievement';
import type { RewardDefinition } from '@/types/reward';
import type { ItemDefinition } from '@/types/item';
import type { ClientConnection } from '@/types/connection';
import type { UserStreakInfo } from '@/components/ui/StreakBadge';
import type { NewUser } from '@/types/user';

/** Mirrors web `XPInfo` from src/lib/xp.ts. */
export type XPInfo = {
  level: number;
  currentXP: number;
  xpForNextLevel: number;
  totalXP: number;
  levelStartXP: number;
  levelEndXP: number;
};

export type PublicUserProfile = {
  user: { id: number; alias: string; age: number | null };
  profilePhoto: { id: number; url: string } | null;
  level: { xp: number; level: number } | null;
  /** Table-driven level/progress, as shown by the web account header. */
  xpInfo?: XPInfo | null;
  isOwnProfile: boolean;
  isFollowing: boolean;
  streak: UserStreakInfo;
  /** Empty for this client: the grid is paged through {@link usersApi.getPosts}. */
  posts: MobilePostType[];
  /** Total posts on the profile grid, independent of how many pages are loaded. */
  postsCount?: number;
};

export type AchievementsResponse = {
  achievements: AccountAchievement[];
  rewardDefinitions: RewardDefinition[];
  itemDefinitions: ItemDefinition[];
};

const enc = encodeURIComponent;

export const usersApi = {
  getProfile: (alias: string): Promise<PublicUserProfile> =>
    apiClient
      // The grid is loaded page by page, so the profile payload skips its inline copy.
      .get<PublicUserProfile>(`/users/${enc(alias)}`, { params: { includePosts: 0 } })
      .then((r) => r.data),

  /** One page of the profile grid, newest first. Omit the cursor for the first page. */
  getPosts: (
    alias: string,
    params: { limit?: number; cursorDate?: string; cursorId?: number }
  ): Promise<MobilePostType[]> =>
    apiClient
      .get<{ posts: MobilePostType[] }>(`/users/${enc(alias)}/posts`, { params })
      .then((r) => r.data.posts),

  /** Most recently registered users. `total` is only sent for the first page. */
  getNewUsers: (limit = 20, offset = 0): Promise<{ users: NewUser[]; total: number | null }> =>
    apiClient
      .get<{ users: NewUser[]; total: number | null }>('/users', { params: { limit, offset } })
      .then((r) => r.data),

  getGuesses: (alias: string): Promise<UserGuess[]> =>
    apiClient.get<{ guesses: UserGuess[] }>(`/users/${enc(alias)}/guesses`).then((r) => r.data.guesses),

  getAchievements: (alias: string): Promise<AchievementsResponse> =>
    apiClient
      .get<AchievementsResponse>(`/users/${enc(alias)}/achievements`)
      .then((r) => ({
        achievements: r.data.achievements ?? [],
        rewardDefinitions: r.data.rewardDefinitions ?? [],
        itemDefinitions: r.data.itemDefinitions ?? [],
      })),

  getConnections: (alias: string): Promise<ClientConnection[]> =>
    apiClient
      .get<{ connections: ClientConnection[] }>(`/users/${enc(alias)}/connections`)
      .then((r) => r.data.connections),

  followUser: (alias: string): Promise<boolean> =>
    apiClient.post<{ isFollowing: boolean }>(`/users/${enc(alias)}/follow`).then((r) => r.data.isFollowing),

  unfollowUser: (alias: string): Promise<boolean> =>
    apiClient.delete<{ isFollowing: boolean }>(`/users/${enc(alias)}/follow`).then((r) => r.data.isFollowing),

  /**
   * Upload a (client-cropped, square) profile photo: get a signed S3 URL, PUT the
   * file, then persist it. Returns the stored public URL.
   */
  uploadProfilePhoto: async (localUri: string, fileSize: number, mimeType = 'image/jpeg'): Promise<string> => {
    const { data } = await apiClient.post<{ signedUrl: string }>('/account/profile-photo/upload-url', {});
    const publicUrl = await uploadToSignedUrl(data.signedUrl, localUri, mimeType);
    const res = await apiClient.post<{ url: string }>('/account/profile-photo', { publicUrl, fileSize });
    return res.data.url;
  },
};
