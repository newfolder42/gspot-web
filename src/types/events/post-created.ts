export interface PostCreatedEvent {
  postId: number;
  postType: string;
  postTitle: string;
  authorId: number;
  authorAlias: string;
}