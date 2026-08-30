import type { PostImageVariants } from './post';
import type { RewardCountType } from './reward';
import type { VoteValue } from './vote';

export type PostCommentType = {
  id: number;
  postId: number;
  userId: number;
  author: string;
  parentId: number | null;
  body: string;
  type: 'comment' | 'gps-guess-comment' | 'gps-photo-guess-comment' | 'hide-and-seek-join-comment' | 'hide-and-seek-check-comment';
  metadata: {
    score?: number | null;
    distance?: number | null;
    /** The full-size guess photo (the master upload). */
    imageUrl?: string | null;
    /** Downscaled derivatives of `imageUrl`; absent on guesses made before the pipeline existed. */
    imageVariants?: PostImageVariants | null;
    /** hide-and-seek-check-comment: the row in hide_and_seek_checks this mirrors. */
    checkId?: number | null;
    /** hide-and-seek-check-comment: set once the check landed inside the catch radius. */
    found?: boolean | null;
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
