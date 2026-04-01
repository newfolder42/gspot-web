export interface PostDeletedEvent {
  postId: number;
  postType: string;
  authorId: number;
  authorAlias: string;
  zoneId: number;
  zoneSlug: string;
}
