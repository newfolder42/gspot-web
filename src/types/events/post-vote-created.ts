export interface PostVoteCreatedEvent {
  postId: number;
  commentId: number | null;
  value: 1 | -1;
  voterId: number;
  voterAlias: string;
  postAuthorId: number;
  postAuthorAlias: string;
  commentAuthorId: number | null;
  commentAuthorAlias: string | null;
  zoneId: number;
  zoneSlug: string;
}
