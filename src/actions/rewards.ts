"use server";

import { getRewardUsers, giveReward, getRewardGivingStatus } from '@/lib/rewards';
import { currentUserCanAccessPost } from '@/lib/post-access';
import { getCurrentUser } from '@/lib/session';
import type { RewardGivingStatusType, RewardSummaryType, RewardUserType } from '@/types/reward';

export async function giveRewardAction(
  postId: number,
  commentId: number | null,
  rewardKey: string
): Promise<RewardSummaryType | null> {
  return giveReward(postId, commentId, rewardKey);
}

export async function loadRewardUsersAction(
  postId: number,
  commentId: number | null
): Promise<RewardUserType[]> {
  if (!(await currentUserCanAccessPost(postId))) return [];
  return getRewardUsers(postId, commentId);
}

export async function loadRewardGivingStatusAction(): Promise<RewardGivingStatusType | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return getRewardGivingStatus(user.userId);
}
