import type { PostGuessType } from '@/types/post-guess';

export type UserGuess = PostGuessType & {
  postTitle: string;
  postAuthor: string;
  postUserId: number;
};
