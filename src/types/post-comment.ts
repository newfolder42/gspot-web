export type PostCommentType = {
  id: number;
  postId: number;
  userId: number;
  author: string;
  parentId: number | null;
  body: string;
  type: 'comment' | 'gps-guess-comment' | 'gps-photo-guess-comment';
  metadata: { score?: number | null; distance?: number | null; imageUrl?: string | null } | null;
  guessId: number | null;
  createdAt: string;
  deletedAt: string | null;
  children: PostCommentType[];
};
