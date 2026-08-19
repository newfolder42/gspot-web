export type RewardTarget = 'post' | 'comment';

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
