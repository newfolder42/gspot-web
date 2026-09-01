import type { PostImageVariants } from './post';
import type { RewardCountType } from './reward';
import type { VoteValue } from './vote';

export type HideAndSeekVisibility = 'public' | 'private';
export type HideAndSeekGameStatus = 'active' | 'ended';
export type HideAndSeekEndedReason = 'expired' | 'host_ended' | 'first_found';
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

/**
 * Everything the host chooses that is not filtered or ordered on in SQL lives in the
 * game's `config` jsonb, so a new option is a new key rather than a new column.
 */
export type HideAndSeekConfigType = {
  latitude: number;
  longitude: number;
  /** Stop the whole game the moment the first seeker lands inside the catch radius. */
  endOnFirstFind: boolean;
};

export const DEFAULT_END_ON_FIRST_FIND = false;

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
  /** Host chose to stop the game as soon as somebody finds them. */
  endOnFirstFind: boolean;
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
  /** True when this check ended the game for everyone — see endOnFirstFind. */
  gameEnded: boolean;
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
  /** Where the host was actually hiding. Always present for them. */
  hidingSpot: { latitude: number; longitude: number } | null;
  catchRadiusM: number;
};

/**
 * One colour per seeker, in join order. Picked to stay apart from each other and from
 * the red hiding-spot pin on satellite imagery; the list wraps on very large games.
 */
export const SEEKER_COLORS = [
  '#38bdf8',
  '#facc15',
  '#a855f7',
  '#22c55e',
  '#fb923c',
  '#ec4899',
  '#2dd4bf',
  '#c084fc',
  '#84cc16',
  '#f472b6',
  '#60a5fa',
  '#fbbf24',
] as const;

export const HIDING_SPOT_COLOR = '#ef4444';

export function seekerColor(index: number): string {
  return SEEKER_COLORS[index % SEEKER_COLORS.length];
}
