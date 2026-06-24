export type PostType = {
  id: number;
  title: string;
  userId: number;
  author: string;
  date: string;
  status: 'processing' | 'published' | 'failed' | 'deleted';
  zoneId: number;
  zoneSlug: string;
  zoneProfilePhoto?: string | null;
  authorLevel?: number | null;
  commentCount?: number | null;
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

export type PostImageVariants = {
  thumb: string;
  feed: string;
};

export type GpsPostType = PostType & {
  type: 'gps-photo';
  image: string;
  imageVariants?: PostImageVariants | null;
  dateTaken?: string | null;
  ratings?: GpsPostRatingType;
  userRating?: DifficultyLevel | null;
  guessCount?: number | null;
  userHasGuessed?: boolean;
  tag?: { id: number; name: string; color: string } | null;
}

export type QuestCompletionPhotoType = {
  url: string;
  objectiveTitle: string | null;
  variants: PostImageVariants | null;
};

export type QuestCompletionPostType = PostType & {
  type: 'quest-completion';
  photos: QuestCompletionPhotoType[];
  questId: number;
  questTitle: string | null;
}

export type FeedPostType = GpsPostType | QuestCompletionPostType;

export type FeedFilter = 'all' | 'guessed' | 'not-guessed';
export type FeedType = 'public' | 'global' | 'account' | 'connection' | 'zone' | 'to-guess';
export type FeedView = 'timeline' | 'grid';
export type PostTypeType = 'gps-photo' | 'text' | 'quest-completion';
