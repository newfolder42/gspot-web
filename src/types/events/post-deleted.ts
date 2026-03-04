export interface PostDeletedEvent {
  postId: number;
  postType: string;
  authorId: number;
  authorAlias: string;
}
