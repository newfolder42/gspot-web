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

export type ZoneMembershipStatus = 'active' | 'pending' | 'left' | 'banned';
export type ZoneMemberRole = 'owner' | 'admin' | 'moderator' | 'member';

export type ZoneMeta = {
  zone: {
    id: number;
    slug: string;
    name: string;
    description: string | null;
    profilePhotoUrl: string | null;
    bannerUrl: string | null;
    visibility: string;
    joinPolicy: string;
  };
  membership: { status: ZoneMembershipStatus; role: ZoneMemberRole } | null;
  questsEnabled: boolean;
  canManage: boolean;
  canModerate: boolean;
};

export type ZoneMember = {
  id: number;
  role: ZoneMemberRole;
  status: ZoneMembershipStatus;
  joinedAt: string;
  user: { id: number; alias: string; profilePhoto: string | null } | null;
};

export type ZoneMembersResponse = {
  members: ZoneMember[];
  canInvite: boolean;
};

export type LeaderboardEntry = {
  userId: number;
  alias: string;
  rating: number;
  level?: number | null;
};

export type LeaderboardPeriod = { key: string; label: string };

export type LeaderboardResponse = {
  periodKey: string;
  periods: LeaderboardPeriod[];
  entries: LeaderboardEntry[];
};

export type ZoneSettings = {
  description: string;
  uploadRules: string[];
  tags: Array<{ id: number; zone_id: number; name: string; color: string; sort_order: number; created_at: string }>;
};

const enc = encodeURIComponent;

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
      .get<ZoneFeedResponse>(`/feed/zone/${enc(slug)}`, { params })
      .then((r) => r.data),

  getMeta: (slug: string): Promise<ZoneMeta> =>
    apiClient.get<ZoneMeta>(`/zones/${enc(slug)}`).then((r) => r.data),

  getMembers: (slug: string): Promise<ZoneMembersResponse> =>
    apiClient.get<ZoneMembersResponse>(`/zones/${enc(slug)}/members`).then((r) => r.data),

  join: (slug: string): Promise<{ status: ZoneMembershipStatus | null; role: ZoneMemberRole | null }> =>
    apiClient.post(`/zones/${enc(slug)}/membership`).then((r) => r.data),

  leave: (slug: string): Promise<{ status: null }> =>
    apiClient.delete(`/zones/${enc(slug)}/membership`).then((r) => r.data),

  getLeaderboard: (slug: string, period?: string): Promise<LeaderboardResponse> =>
    apiClient
      .get<LeaderboardResponse>(`/zones/${enc(slug)}/leaderboard`, { params: period ? { period } : undefined })
      .then((r) => r.data),

  getSettings: (slug: string): Promise<ZoneSettings> =>
    apiClient.get<ZoneSettings>(`/zones/${enc(slug)}/settings`).then((r) => r.data),

  updateSettings: (slug: string, body: { description: string; uploadRules: string[] }): Promise<{ description: string; uploadRules: string[] }> =>
    apiClient.patch(`/zones/${enc(slug)}/settings`, body).then((r) => r.data),

  createTag: (slug: string, name: string, color: string): Promise<{ tag: ZoneSettings['tags'][number] }> =>
    apiClient.post(`/zones/${enc(slug)}/tags`, { name, color }).then((r) => r.data),

  deleteTag: (slug: string, tagId: number): Promise<{ success: boolean }> =>
    apiClient.delete(`/zones/${enc(slug)}/tags/${tagId}`).then((r) => r.data),

  inviteMember: (slug: string, alias: string): Promise<{ success: boolean }> =>
    apiClient.post(`/zones/${enc(slug)}/members/invite`, { alias }).then((r) => r.data),
};
