export interface PostFailedEvent {
  postId: number;
  postType: string;
  postTitle: string;
  authorId: number;
  authorAlias: string;
  zoneId: number;
  zoneSlug: string;
  reason?: string | null;
}
