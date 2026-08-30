export interface HideAndSeekCreatedEvent {
  gameId: number;
  postId: number;
  title: string;
  hostId: number;
  hostAlias: string;
  visibility: 'public' | 'private';
  endsAt: string;
  zoneId: number;
  zoneSlug: string;
  inviteeIds: number[];
}

export interface HideAndSeekJoinedEvent {
  gameId: number;
  postId: number;
  hostId: number;
  hostAlias: string;
  userId: number;
  userAlias: string;
  commentId: number;
}

export interface HideAndSeekCheckedEvent {
  gameId: number;
  postId: number;
  hostId: number;
  hostAlias: string;
  userId: number;
  userAlias: string;
  checkId: number;
  commentId: number;
  distanceMeters: number;
  /** A busy game is dozens of checks — the host is only notified when this is true. */
  isNewBest: boolean;
  found: boolean;
}

export interface HideAndSeekFoundEvent {
  gameId: number;
  postId: number;
  hostId: number;
  hostAlias: string;
  userId: number;
  userAlias: string;
  distanceMeters: number;
  checkCount: number;
}

export interface HideAndSeekEndedEvent {
  gameId: number;
  postId: number;
  hostId: number;
  reason: 'expired' | 'host_ended';
  /** Everyone who took part, host included — they all get the wrap-up notification. */
  participantIds: number[];
}
