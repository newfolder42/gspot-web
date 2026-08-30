/** Where a reward may be given — matches the values in `rewards.applies_to`. */
export type RewardTarget = 'post' | 'comment' | 'hide-and-seek-check';

/**
 * What a reward was attached to. Travels on the reward event and is persisted in the
 * notification's `details`, not on `post_rewards` — nothing queries rewards by it.
 * Finer-grained than RewardTarget: guess comments select from the plain 'comment'
 * catalog but need their own notification copy.
 */
export type RewardTargetKind = 'post' | 'comment' | 'guess-comment' | 'hide-and-seek-check';

/** ცხელა / თბილა / ცივა — host-only flavour on a hide-and-seek check. */
export const HIDE_AND_SEEK_REWARD_KEYS = ['hot', 'warm', 'cold'] as const;

export function isHideAndSeekReward(key: string): boolean {
  return (HIDE_AND_SEEK_REWARD_KEYS as readonly string[]).includes(key);
}

export type UserXpRewardSpec = {
  type: 'user-xp';
  value: number;
};

export type CatalogRewardSpec = {
  type: 'reward';
  key: string;
};

export type RewardLimitRewardSpec = {
  type: 'reward-limit';
  value: number;
};

export type RewardSpec = UserXpRewardSpec | CatalogRewardSpec | RewardLimitRewardSpec;

export const QUEST_XP_MIN = 100;
export const QUEST_XP_MAX = 1000;
export const QUEST_XP_DEFAULT = 200;

export function getRewardSpecXp(rewards: RewardSpec[]): number | null {
  const spec = rewards.find((r): r is UserXpRewardSpec => r.type === 'user-xp');
  return spec ? spec.value : null;
}

export function getRewardSpecLimitIncrease(rewards: RewardSpec[]): number {
  return rewards
    .filter((r): r is RewardLimitRewardSpec => r.type === 'reward-limit')
    .reduce((sum, r) => sum + r.value, 0);
}

export function getCatalogRewardKeys(rewards: RewardSpec[]): string[] {
  return rewards.filter((r): r is CatalogRewardSpec => r.type === 'reward').map((r) => r.key);
}

export type RewardStatus = 'active' | 'disabled';

export const DEFAULT_DAILY_REWARD_LIMIT = 2;

export type RewardDefinition = {
  key: string;
  name: string;
  appliesTo: RewardTarget[];
  unlockable: boolean;
  iconUrl: string | null;
  status: RewardStatus;
};

export function getSelectableRewardsForTarget(definitions: RewardDefinition[], target: RewardTarget): RewardDefinition[] {
  return definitions.filter((d) => d.status === 'active' && d.appliesTo.includes(target));
}

/** The reward target a comment selects from, given its comment type. */
export function rewardTargetForCommentType(commentType: string): RewardTarget {
  return commentType === 'hide-and-seek-check-comment' ? 'hide-and-seek-check' : 'comment';
}

/** The kind stored on the reward row, which decides the notification wording. */
export function rewardTargetKindForCommentType(commentType: string | null): RewardTargetKind {
  if (commentType === null) return 'post';
  if (commentType === 'hide-and-seek-check-comment') return 'hide-and-seek-check';
  if (commentType === 'gps-guess-comment' || commentType === 'gps-photo-guess-comment') return 'guess-comment';
  return 'comment';
}

export type RewardCountType = {
  key: string;
  count: number;
  name: string;
  iconUrl: string | null;
};

export type RewardSummaryType = {
  rewards: RewardCountType[];
  userReward: string | null;
};

export type RewardUserType = {
  key: string;
  userId: number;
  alias: string;
  level: number | null;
  createdAt: string;
  name: string;
  iconUrl: string | null;
};

export type RewardGivingStatusType = {
  definitions: RewardDefinition[];
  unlockedKeys: string[];
  dailyLimit: number;
  remainingToday: number;
};
