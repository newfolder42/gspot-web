import { apiClient } from '@/lib/api';
import { uploadToSignedUrl } from '@/lib/upload';
import type { MobilePostType } from '@/types/post';
import type { UserGuess } from '@/types/guess';
import type { AccountAchievement } from '@/types/achievement';
import type { ClientConnection } from '@/types/connection';

export type PublicUserProfile = {
  user: { id: number; alias: string; age: number | null };
  profilePhoto: { id: number; url: string } | null;
  level: { xp: number; level: number } | null;
  isOwnProfile: boolean;
  isFollowing: boolean;
  posts: MobilePostType[];
};

const enc = encodeURIComponent;

export const usersApi = {
  getProfile: (alias: string): Promise<PublicUserProfile> =>
    apiClient.get<PublicUserProfile>(`/users/${enc(alias)}`).then((r) => r.data),

  getGuesses: (alias: string): Promise<UserGuess[]> =>
    apiClient.get<{ guesses: UserGuess[] }>(`/users/${enc(alias)}/guesses`).then((r) => r.data.guesses),

  getAchievements: (alias: string): Promise<AccountAchievement[]> =>
    apiClient
      .get<{ achievements: AccountAchievement[] }>(`/users/${enc(alias)}/achievements`)
      .then((r) => r.data.achievements),

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
