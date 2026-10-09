export interface PostSuspendedEvent {
  postId: number;
  postTitle: string;
  suspensionId: number;
  authorId: number;
  authorAlias: string;
  /** The staff member who suspended it. */
  actorId: number;
  actorAlias: string;
  zoneId: number;
  zoneSlug: string;
  /** What the admin wrote to the author, if anything. */
  note: string | null;
}
