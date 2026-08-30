import type { RewardTargetKind } from '@/types/reward';

export interface PostRewardCreatedEvent {
  postId: number;
  commentId: number | null;
  targetType: RewardTargetKind;
  rewardKey: string;
  rewardName: string;
  giverId: number;
  giverAlias: string;
  postAuthorId: number;
  postAuthorAlias: string;
  commentAuthorId: number | null;
  commentAuthorAlias: string | null;
  zoneId: number;
  zoneSlug: string;
}
