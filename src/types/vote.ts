export type VoteTarget = 'post' | 'comment';

export type VoteValue = 1 | -1;

export type VoteSummaryType = {
  score: number;
  userVote: VoteValue | null;
};
