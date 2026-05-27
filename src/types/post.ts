export type PostType = {
  id: number;
  type: PostTypeType;
  title: string;
  userId: number;
  author: string;
  date: string;
  status: 'processing' | 'published' | 'failed' | 'deleted';
  zoneId: number;
  zoneSlug?: string;
  zoneProfilePhoto?: string | null;
};

export enum DifficultyLevel {
  DOWNVOTE = -1,
  EASY = 1,
  GOOD = 2,
  HARD = 3
}

export type GpsPostRatingType = {
  DOWNVOTE: number;
  EASY: number;
  GOOD: number;
  HARD: number;
  total: number;
};

export type GpsPostType = PostType & {
  image: string;
  dateTaken?: string | null;
  ratings?: GpsPostRatingType;
  userRating?: DifficultyLevel | null;
  guessCount?: number | null;
  commentCount?: number | null;
  userHasGuessed?: boolean;
  tag?: { id: number; name: string; color: string } | null;
}

export type FeedFilter = 'all' | 'guessed' | 'not-guessed';
export type FeedType = 'public' | 'global' | 'account' | 'connection' | 'zone';
export type FeedView = 'timeline' | 'grid';
export type PostTypeType = 'gps-photo' | 'text';