export type PostCommentType = {
  id: number;
  postId: number;
  userId: number;
  author: string;
  parentId: number | null;
  body: string;
  type: 'comment' | 'gps-post-guess';
  metadata: { score?: number | null; distance?: number | null } | null;
  guessId: number | null;
  createdAt: string;
  deletedAt: string | null;
  children: PostCommentType[];
};
