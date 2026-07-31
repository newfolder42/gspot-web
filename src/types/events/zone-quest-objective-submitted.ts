export interface ZoneQuestObjectiveSubmittedEvent {
  objectiveId: number;
  objectiveTitle: string | null;
  questId: number;
  questTitle: string;
  zoneId: number;
  zoneSlug: string;
  userId: number;
  userAlias: string;
}
