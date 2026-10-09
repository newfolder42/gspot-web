export interface PostLocationDisputedEvent {
  postId: number;
  postTitle: string;
  disputeId: number;
  authorId: number;
  authorAlias: string;
  reporterId: number;
  reporterAlias: string;
  zoneId: number;
  zoneSlug: string;
  /** Open disputes on the post, this one included. */
  openCount: number;
  /** This is the first open dispute — the only one that notifies. */
  firstOpen: boolean;
  /** Why it was contested, and the guesser's own words if they gave any. */
  reason: string;
  note: string | null;
}
