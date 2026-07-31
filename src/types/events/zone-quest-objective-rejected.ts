export interface ZoneQuestObjectiveRejectedEvent {
  objectiveId: number;
  objectiveTitle: string | null;
  questId: number;
  zoneId: number;
  zoneSlug: string;
  userId: number;
  rejectionReason: string | null;
}
