export interface ZoneQuestCompletedEvent {
  questId: number;
  questTitle: string;
  zoneId: number;
  zoneSlug: string;
  userId: number;
  userAlias: string;
  objectives: { objectiveTitle: string | null; photoUrl: string | null }[];
}
