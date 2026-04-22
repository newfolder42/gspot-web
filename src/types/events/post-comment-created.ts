export interface PostCommentCreatedEvent {
  postId: number;
  commentId: number;
  parentId: number | null;
  commentType: 'comment' | 'gps-post-guess';
  commentBody: string;
  postAuthorId: number;
  postAuthorAlias: string;
  commenterId: number;
  commenterAlias: string;
  zoneId: number;
  zoneSlug: string;
}