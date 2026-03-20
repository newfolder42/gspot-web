export type AchievementState = 'visible' | 'hidden';

export type AccountAchievement = {
  achievementId: number;
  trackId: number;
  trackKey: string;
  key: string;
  name: string;
  category: string;
  maxProgress: number | null;
  state: AchievementState;
  imageUrl: string | null;
  progress: number;
  achievedAt: string | null;
  inProgress: boolean;
  isAchieved: boolean;
};
