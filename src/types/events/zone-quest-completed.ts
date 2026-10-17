export interface ZoneQuestCompletedEvent {
  questId: number;
  questTitle: string;
  zoneId: number;
  zoneSlug: string;
  userId: number;
  userAlias: string;
  // The finished run (repeatable quests have several per member).
  userQuestId?: number;
  objectives: { objectiveTitle: string | null; photoUrl: string | null }[];
}
