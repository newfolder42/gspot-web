"use server";

import { createPostComment, getPostComments } from '@/lib/comments';
import { currentUserCanAccessPost } from '@/lib/post-access';
import type { PostCommentType } from '@/types/post-comment';

export async function addCommentAction(
  postId: number,
  body: string,
  parentId?: number | null
): Promise<PostCommentType | null> {
  return createPostComment(postId, body, parentId);
}

function buildCommentTree(flat: PostCommentType[]): PostCommentType[] {
  const map = new Map<number, PostCommentType>();
  const roots: PostCommentType[] = [];

  for (const c of flat) {
    map.set(c.id, { ...c, children: [] });
  }

  for (const c of flat) {
    const node = map.get(c.id)!;
    if (c.parentId === null) {
      roots.push(node);
    } else {
      const parent = map.get(c.parentId);
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }
  }

  return roots;
}

export async function loadPostCommentsAction(postId: number): Promise<PostCommentType[]> {
  if (!(await currentUserCanAccessPost(postId))) return [];
  return buildCommentTree(await getPostComments(postId));
}
