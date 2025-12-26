export type PostType = {
  id: number;
  type: string;
  title: string;
  userId: number;
  author: string;
  date: string;
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
}