export interface ZoneMemberAddedEvent {
  invitedBy: number;
  invitedByAlias: string;
  userId: number;
  userAlias: string;
  zoneId: number;
  zoneSlug: string;
  status: string;
}
