import type { PostCommentType } from '@/types/post-comment';
import type { RewardSummaryType } from '@/types/reward';
import type { VoteSummaryType } from '@/types/vote';

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
  type: 'gps-photo' | 'text' | 'quest-completion';
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
};

export type PostDetailResponse = {
  post: MobilePostType;
  alreadyGuessed: boolean;
  comments: PostCommentType[];
  /** Post-level vote summary; each comment carries its own. */
  votes: VoteSummaryType;
  /** Post-level reward summary; each comment carries its own. */
  rewards: RewardSummaryType;
};
