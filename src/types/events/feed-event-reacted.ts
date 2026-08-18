export interface FeedEventReactedEvent {
  eventId: number;
  eventType: string;
  reaction: 'upvote';
  reactorId: number;
  reactorAlias: string;
  ownerId: number;
  ownerAlias: string;
}
