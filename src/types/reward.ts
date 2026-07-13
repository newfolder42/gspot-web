export type RewardTarget = 'post' | 'comment';

export type RewardStatus = 'active' | 'disabled';

// default max rewards a single user may give (across all posts/comments) per calendar day,
// used when the user has no personal override in user_reward_limits (raised e.g. via quests/levels)
export const DEFAULT_DAILY_REWARD_LIMIT = 2;

export type RewardDefinition = {
  key: string;
  // Georgian display name
  name: string;
  // which targets this reward can be applied to (app-level rule, not enforced by the database)
  appliesTo: RewardTarget[];
  // unlockable rewards are earned via achievements/quests
  unlockable: boolean;
  // hosted image for the reward
  iconUrl: string | null;
  // disabled rewards can no longer be chosen, but stay visible wherever already given
  status: RewardStatus;
};

// rewards a user can currently pick from the "give a reward" dialog for this target —
// excludes disabled rewards.
export function getSelectableRewardsForTarget(definitions: RewardDefinition[], target: RewardTarget): RewardDefinition[] {
  return definitions.filter((d) => d.status === 'active' && d.appliesTo.includes(target));
}

// count of one reward kind on a post/comment — name/iconUrl are denormalized from the
// rewards catalog at query time so chips can render without a separate definitions fetch.
export type RewardCountType = {
  key: string;
  count: number;
  name: string;
  iconUrl: string | null;
};

// grouped counts + the logged-in user's own active reward on a single target
export type RewardSummaryType = {
  rewards: RewardCountType[];
  userReward: string | null;
};

// one row of the "who gave a reward" detail list
export type RewardUserType = {
  key: string;
  userId: number;
  alias: string;
  level: number | null;
  createdAt: string;
  name: string;
  iconUrl: string | null;
};

// fetched when the "give a reward" dialog opens, not on page load — bundles the catalog
// (rarely needed, so no point fetching it eagerly either) with the per-user unlock/quota state.
export type RewardGivingStatusType = {
  definitions: RewardDefinition[];
  unlockedKeys: string[];
  // this user's effective daily quota (personal override or the default)
  dailyLimit: number;
  remainingToday: number;
};
