"use server";

import { createPostComment, getPostComments } from '@/lib/comments';
import type { PostCommentType } from '@/types/post-comment';

export async function addCommentAction(
  postId: number,
  body: string,
  parentId?: number | null
): Promise<PostCommentType | null> {
  return createPostComment(postId, body, parentId);
}

export async function loadPostCommentsAction(postId: number): Promise<PostCommentType[]> {
  return getPostComments(postId);
}
