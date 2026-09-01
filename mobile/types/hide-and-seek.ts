import type { PostImageVariants } from '@/types/post';

export type HideAndSeekVisibility = 'public' | 'private';
export type HideAndSeekGameStatus = 'active' | 'ended';
export type HideAndSeekRole = 'host' | 'seeker';
export type HideAndSeekPlayerStatus = 'active' | 'found' | 'out_of_checks' | 'ended';

/** მცდელობების რაოდენობა — how many checks each seeker gets, chosen by the host. */
export const MIN_CHECKS = 5;
export const MAX_CHECKS = 50;
export const DEFAULT_CHECKS = 10;

export const MIN_DURATION_MINUTES = 30;
export const MAX_DURATION_MINUTES = 360;
export const DURATION_STEP_MINUTES = 30;
export const DEFAULT_DURATION_MINUTES = 60;

/** Stop the game for everybody the moment the first seeker lands inside the catch radius. */
export const DEFAULT_END_ON_FIRST_FIND = false;

/** 30, 60, 90 … 360 — the durations the host can pick from. */
export const DURATION_OPTIONS: number[] = Array.from(
  { length: (MAX_DURATION_MINUTES - MIN_DURATION_MINUTES) / DURATION_STEP_MINUTES + 1 },
  (_, i) => MIN_DURATION_MINUTES + i * DURATION_STEP_MINUTES
);

/** "1 სთ 30 წთ" / "45 წთ" */
export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} წთ`;
  if (mins === 0) return `${hours} სთ`;
  return `${hours} სთ ${mins} წთ`;
}

/** "820 მ" / "1.4 კმ" */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} მ`;
  return `${(meters / 1000).toFixed(1)} კმ`;
}

/** Time left on the clock as "1:04:20" / "4:20". */
export function formatRemaining(endsAt: string): string {
  const ms = Math.max(0, new Date(endsAt).getTime() - Date.now());
  const total = Math.floor(ms / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

export function hasExpired(endsAt: string): boolean {
  return new Date(endsAt).getTime() <= Date.now();
}

export type HideAndSeekPlayerType = {
  id: number;
  gameId: number;
  userId: number;
  alias: string;
  level: number | null;
  role: HideAndSeekRole;
  status: HideAndSeekPlayerStatus;
  commentId: number | null;
  lastDistance: number | null;
  bestDistance: number | null;
  checkCount: number;
  joinedAt: string;
  foundAt: string | null;
};

export type HideAndSeekViewerStateType = {
  playerId: number;
  role: HideAndSeekRole;
  status: HideAndSeekPlayerStatus;
  commentId: number | null;
  lastDistance: number | null;
  bestDistance: number | null;
  checkCount: number;
  checksRemaining: number;
};

export type HideAndSeekGameType = {
  id: number;
  postId: number;
  title: string;
  hostId: number;
  hostAlias: string;
  hostLevel: number | null;
  zoneId: number;
  zoneSlug: string;
  visibility: HideAndSeekVisibility;
  status: HideAndSeekGameStatus;
  catchRadiusM: number;
  maxChecks: number;
  durationMinutes: number;
  /** Host chose to stop the game as soon as somebody finds them. */
  endOnFirstFind: boolean;
  endsAt: string;
  endedAt: string | null;
  endedReason: 'expired' | 'host_ended' | 'first_found' | null;
  createdAt: string;
  playerCount: number;
  foundCount: number;
  /** Host-only until the game ends. */
  coordinates: { latitude: number; longitude: number } | null;
  viewer: HideAndSeekViewerStateType | null;
};

export type HideAndSeekListFilter = 'all' | 'active' | 'ended';

/** One row on the games list. */
export type HideAndSeekListItemType = {
  gameId: number;
  postId: number;
  title: string;
  status: HideAndSeekGameStatus;
  visibility: HideAndSeekVisibility;
  hostId: number;
  hostAlias: string;
  hostLevel: number | null;
  zoneSlug: string;
  endsAt: string;
  endedAt: string | null;
  createdAt: string;
  maxChecks: number;
  durationMinutes: number;
  playerCount: number;
  foundCount: number;
  viewerRole: HideAndSeekRole | null;
};

export type ActiveHideAndSeekType = {
  gameId: number;
  postId: number;
  title: string;
  hostAlias: string;
  role: HideAndSeekRole;
  status: HideAndSeekPlayerStatus;
  endsAt: string;
  checksRemaining: number;
  playerCount: number;
  foundCount: number;
};

export type HideAndSeekCheckResultType = {
  checkId: number;
  commentId: number;
  distanceMeters: number;
  found: boolean;
  checksRemaining: number;
  status: HideAndSeekPlayerStatus;
  /** True when this check ended the game for everyone — see endOnFirstFind. */
  gameEnded: boolean;
};

export type HideAndSeekGameResponse = {
  game: HideAndSeekGameType;
  players: HideAndSeekPlayerType[];
};

export type CheckPhotoMeta = {
  imageUrl: string | null;
  imageVariants: PostImageVariants | null;
};

/** One check as it lands on the host's post-game map. */
export type HideAndSeekCheckMapPointType = {
  checkId: number;
  userId: number;
  author: string;
  distanceMeters: number;
  /** The check that caught the host — drawn larger than the rest. */
  found: boolean;
  coordinates: { latitude: number; longitude: number };
  createdAt: string;
};

/** One seeker's whole trail, so the map can colour and label per player. */
export type HideAndSeekCheckMapSeekerType = {
  userId: number;
  alias: string;
  color: string;
  checkCount: number;
  bestDistance: number | null;
  found: boolean;
};

export type HideAndSeekCheckMapDataType = {
  points: HideAndSeekCheckMapPointType[];
  seekers: HideAndSeekCheckMapSeekerType[];
  hidingSpot: { latitude: number; longitude: number } | null;
  catchRadiusM: number;
};

/** The seeker colours come down with the map data; only the hiding pin is fixed here. */
export const HIDING_SPOT_COLOR = '#ef4444';
