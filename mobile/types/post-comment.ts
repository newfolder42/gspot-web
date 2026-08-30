import type { PostImageVariants } from '@/types/post';
import type { RewardCountType } from '@/types/reward';
import type { VoteValue } from '@/types/vote';

export type PostCommentType = {
  id: number;
  postId: number;
  userId: number;
  author: string;
  parentId: number | null;
  body: string;
  type: 'comment' | 'gps-guess-comment' | 'gps-photo-guess-comment';
  metadata: {
    score?: number | null;
    distance?: number | null;
    /** The full-size guess photo (the master upload). */
    imageUrl?: string | null;
    /** Downscaled derivatives of `imageUrl`; absent on guesses made before the pipeline existed. */
    imageVariants?: PostImageVariants | null;
  } | null;
  guessId: number | null;
  createdAt: string;
  deletedAt: string | null;
  children: PostCommentType[];
  authorLevel?: number | null;
  voteScore?: number;
  userVote?: VoteValue | null;
  rewards?: RewardCountType[];
  userReward?: string | null;
};
