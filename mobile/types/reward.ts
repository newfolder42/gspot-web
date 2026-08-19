/** Mirrors web src/types/reward.ts (the parts the app needs). */

export type RewardTarget = 'post' | 'comment';

export type RewardStatus = 'active' | 'disabled';

/** A typed reward granted by a quest/achievement/milestone, shown as a tile. */
export type UserXpRewardSpec = {
  type: 'user-xp';
  value: number;
};

export type CatalogRewardSpec = {
  type: 'reward';
  key: string;
};

/** Permanently raises the user's daily reward-giving quota by `value`. */
export type RewardLimitRewardSpec = {
  type: 'reward-limit';
  value: number;
};

export type RewardSpec = UserXpRewardSpec | CatalogRewardSpec | RewardLimitRewardSpec;

export type RewardDefinition = {
  key: string;
  name: string;
  appliesTo: RewardTarget[];
  unlockable: boolean;
  iconUrl: string | null;
  status: RewardStatus;
};

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

export function getSelectableRewardsForTarget(
  definitions: RewardDefinition[],
  target: RewardTarget
): RewardDefinition[] {
  return definitions.filter((d) => d.status === 'active' && d.appliesTo.includes(target));
}
