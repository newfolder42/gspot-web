export type FeedEventType = 'quest_completed' | 'achievement_unlocked' | 'quest_created';

export type FeedEventPhoto = {
  url: string;
  thumb: string | null;
  feed: string | null;
  objectiveTitle: string | null;
};

export type QuestCompletedDetails = {
  questId: number;
  questTitle: string;
  zoneId: number;
  zoneSlug: string;
  userAlias?: string;
  characterAvatar: string | null;
  postId: number | null;
  photos: FeedEventPhoto[];
};

export type AchievementUnlockedDetails = {
  achievementKey: string;
  achievementName: string;
  achievementType: 'one_time' | 'progressive';
  milestoneKey: string | null;
  milestoneName: string | null;
  imageUrl: string | null;
  achievedAt: string | null;
};

export type QuestCreatedDetails = {
  questId: number;
  questTitle: string;
  zoneId: number;
  zoneSlug: string;
  zoneName: string;
  characterName: string | null;
  characterAvatar: string | null;
  createdByAlias?: string;
};

export type FeedEventDetails = QuestCompletedDetails | AchievementUnlockedDetails | QuestCreatedDetails;

/** A single happening (one user's quest completion / achievement unlock). */
export type FeedEvent = {
  id: number;
  type: FeedEventType;
  groupKey: string;
  refId: number | null;
  createdAt: string;
  actorAlias: string;
  actorLevel: number | null;
  seen: boolean;
  /** Whether the current viewer has already reacted (upvoted) to this event. */
  reacted: boolean;
  details: FeedEventDetails;
};

/** One preview bubble in the strip — a quest or achievement across users. */
export type FeedEventBubble = {
  groupKey: string;
  type: FeedEventType;
  title: string;
  previewImage: string | null;
  total: number;
  hasUnseen: boolean;
  latestAt: string;
};

/** Own event, augmented with how many followers have viewed / reacted to it. */
export type OwnFeedEvent = FeedEvent & { seenCount: number; reactionCount: number };

export type FeedEventViewer = {
  alias: string;
  level: number | null;
  seenAt: string;
  reacted: boolean;
};

export function feedEventTitle(details: FeedEventDetails, type: FeedEventType): string {
  if (type === 'quest_completed') {
    const d = details as QuestCompletedDetails;
    return d.questTitle;
  }
  if (type === 'quest_created') {
    const d = details as QuestCreatedDetails;
    return d.questTitle;
  }
  const a = details as AchievementUnlockedDetails;
  return a.milestoneName || a.achievementName;
}

export function feedEventPreviewImage(details: FeedEventDetails, type: FeedEventType): string | null {
  if (type === 'quest_completed') {
    const d = details as QuestCompletedDetails;
    return d.characterAvatar ?? d.photos?.[0]?.thumb ?? d.photos?.[0]?.url ?? null;
  }
  if (type === 'quest_created') {
    return (details as QuestCreatedDetails).characterAvatar ?? null;
  }
  return (details as AchievementUnlockedDetails).imageUrl ?? null;
}
