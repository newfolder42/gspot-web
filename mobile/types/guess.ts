import type { PostGuessType } from '@/types/post-guess';

export type UserGuess = PostGuessType & {
  postTitle: string;
  postAuthor: string;
  postUserId: number;
  /** false when the post's zone is left out of the guess index; absent from older servers */
  inGuessIndex?: boolean;
};
