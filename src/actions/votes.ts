"use server";

import { toggleVote } from '@/lib/votes';
import type { VoteSummaryType, VoteValue } from '@/types/vote';

export async function toggleVoteAction(
  postId: number,
  commentId: number | null,
  value: VoteValue
): Promise<VoteSummaryType | null> {
  return toggleVote(postId, commentId, value);
}
