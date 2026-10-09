export interface PostLocationCorrectedGuess {
  guessId: number;
  userId: number;
  guessType: string;
  previousScore: number;
  score: number;
  /** When the guess was placed — leaderboard week/month buckets follow this, not the correction. */
  guessedAt: string;
}

export interface PostLocationCorrectedEvent {
  postId: number;
  postTitle: string;
  authorId: number;
  authorAlias: string;
  zoneId: number;
  zoneSlug: string;
  /** Only the guesses whose score actually changed. */
  guesses: PostLocationCorrectedGuess[];
}
