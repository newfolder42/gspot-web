export interface PostGuessedEvent {
  postId: number;
  guessType: string;
  authorId: number;
  authorAlias: string;
  userId: number;
  userAlias: string;
  score: number;
}