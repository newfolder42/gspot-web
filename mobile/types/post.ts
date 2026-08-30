import type { PostCommentType } from '@/types/post-comment';
import type { RewardSummaryType } from '@/types/reward';
import type { VoteSummaryType } from '@/types/vote';
import type { HideAndSeekGameType, HideAndSeekPlayerType } from '@/types/hide-and-seek';

export type PostImageVariants = {
  thumb: string;
  feed: string;
};

export type QuestCompletionPhotoType = {
  url: string;
  objectiveTitle: string | null;
  variants: PostImageVariants | null;
};

export type MobilePostType = {
  id: number;
  type: 'gps-photo' | 'text' | 'quest-completion' | 'hide-and-seek';
  title: string;
  userId: number;
  author: string;
  date: string;
  status: 'processing' | 'published' | 'failed' | 'deleted';
  zoneId: number;
  zoneSlug?: string;
  zoneProfilePhoto?: string | null;
  image: string;
  /** Resized renditions; prefer `feed` in lists and `thumb` in grids. */
  imageVariants?: PostImageVariants | null;
  dateTaken?: string | null;
  guessCount?: number | null;
  commentCount?: number | null;
  voteScore?: number | null;
  userHasGuessed?: boolean;
  tag?: { id: number; name: string; color: string } | null;
  authorLevel?: number | null;
  // quest-completion posts only
  photos?: QuestCompletionPhotoType[];
  questId?: number;
  questTitle?: string | null;
  // hide-and-seek posts only
  gameId?: number;
  gameStatus?: 'active' | 'ended';
  visibility?: 'public' | 'private';
  endsAt?: string;
  maxChecks?: number;
  playerCount?: number;
  foundCount?: number;
  /** The viewer's own role in this game, when they have one. */
  viewerRole?: 'host' | 'seeker' | null;
};

/**
 * A post as the detail endpoint returns it: the feed shape plus whatever that type needs.
 * A hide-and-seek post arrives with its game and players, so the screen needs no second call.
 */
export type MobilePostDetailType = MobilePostType & {
  game?: HideAndSeekGameType;
  players?: HideAndSeekPlayerType[];
  alreadyGuessed?: boolean;
};

export type PostDetailResponse = {
  post: MobilePostDetailType;
  alreadyGuessed: boolean;
  comments: PostCommentType[];
  /** Post-level vote summary; each comment carries its own. */
  votes: VoteSummaryType;
  /** Post-level reward summary; each comment carries its own. */
  rewards: RewardSummaryType;
};
