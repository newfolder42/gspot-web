export interface ZoneQuestCreatedEvent {
  questId: number;
  questTitle: string;
  description: string | null;
  zoneId: number;
  zoneSlug: string;
  character: {
    id: number;
    name: string;
    slug: string;
    avatarUrl: string | null;
  } | null;
  requiredLevel: number | null;
  startDate: string | null;
  endDate: string | null;
  createdBy: number;
  createdByAlias: string;
}
