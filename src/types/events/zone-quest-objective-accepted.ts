export interface ZoneQuestObjectiveAcceptedEvent {
  objectiveId: number;
  objectiveTitle: string | null;
  questId: number;
  zoneId: number;
  zoneSlug: string;
  userId: number;
}
