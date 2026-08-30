import type { PostImageVariants } from './post';
import type { RewardCountType } from './reward';
import type { VoteValue } from './vote';

export type HideAndSeekVisibility = 'public' | 'private';
export type HideAndSeekGameStatus = 'active' | 'ended';
export type HideAndSeekEndedReason = 'expired' | 'host_ended';
export type HideAndSeekRole = 'host' | 'seeker';
export type HideAndSeekPlayerStatus = 'active' | 'found' | 'out_of_checks' | 'ended';

/** Distance inside which a check completes the game for that seeker. */
export const CATCH_RADIUS_METERS = 50;

/** მცდელობების რაოდენობა — how many checks each seeker gets, chosen by the host. */
export const MIN_CHECKS = 5;
export const MAX_CHECKS = 50;
export const DEFAULT_CHECKS = 10;

export const MIN_DURATION_MINUTES = 30;
export const MAX_DURATION_MINUTES = 360;
export const DURATION_STEP_MINUTES = 30;
export const DEFAULT_DURATION_MINUTES = 60;

/** 30, 60, 90 … 360 — the durations the host can pick from. */
export const DURATION_OPTIONS: number[] = Array.from(
  { length: (MAX_DURATION_MINUTES - MIN_DURATION_MINUTES) / DURATION_STEP_MINUTES + 1 },
  (_, i) => MIN_DURATION_MINUTES + i * DURATION_STEP_MINUTES
);

export function isValidDuration(minutes: number): boolean {
  return (
    Number.isInteger(minutes) &&
    minutes >= MIN_DURATION_MINUTES &&
    minutes <= MAX_DURATION_MINUTES &&
    minutes % DURATION_STEP_MINUTES === 0
  );
}

export function isValidMaxChecks(value: number): boolean {
  return Number.isInteger(value) && value >= MIN_CHECKS && value <= MAX_CHECKS;
}

/** "1 სთ 30 წთ" / "45 წთ" — used for durations and for time remaining. */
export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} წთ`;
  if (mins === 0) return `${hours} სთ`;
  return `${hours} სთ ${mins} წთ`;
}

/** "820 მ" / "1.4 კმ" — how a check's distance reads in the comment thread. */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} მ`;
  return `${(meters / 1000).toFixed(1)} კმ`;
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

export type HideAndSeekCheckType = {
  id: number;
  gameId: number;
  playerId: number;
  userId: number;
  alias: string;
  distanceMeters: number;
  /** Null for viewers who may not see the photo yet — see canSeeCheckPhoto. */
  imageUrl: string | null;
  imageVariants: PostImageVariants | null;
  commentId: number | null;
  createdAt: string;
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
  endsAt: string;
  endedAt: string | null;
  endedReason: HideAndSeekEndedReason | null;
  createdAt: string;
  playerCount: number;
  foundCount: number;
  /** Only ever populated for the host, or for anyone once the game has ended. */
  coordinates: { latitude: number; longitude: number } | null;
  /** The current viewer's own participation, when they have one. */
  viewer: HideAndSeekViewerStateType | null;
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

export type HideAndSeekListFilter = 'all' | 'active' | 'ended';

/** One row on the /hide-and-seek index. */
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

/** What the floating "ongoing game" button needs, in one row. */
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
};

/** A check as it renders in the comment thread — distance always, photo conditionally. */
export type HideAndSeekCheckCommentType = {
  id: number;
  author: string;
  authorLevel: number | null;
  distanceMeters: number;
  imageUrl: string | null;
  imageVariants: PostImageVariants | null;
  createdAt: string;
  voteScore: number;
  userVote: VoteValue | null;
  rewards: RewardCountType[];
  userReward: string | null;
};

/**
 * Photos stay hidden while the game runs so nobody can read the thread and work out
 * where everyone has already looked. Distance is public by design — the host wants the
 * chase visible. Once the game ends everything opens up.
 */
export function canSeeCheckPhoto(
  viewerId: number | null | undefined,
  checkAuthorId: number,
  hostId: number,
  gameStatus: HideAndSeekGameStatus
): boolean {
  if (gameStatus === 'ended') return true;
  if (!viewerId) return false;
  return viewerId === checkAuthorId || viewerId === hostId;
}
