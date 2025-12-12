"use server";

import { query } from '@/lib/db';
import { logerror } from './logger';
import type { SearchedPost, SearchedUser } from '@/types/searched';

export async function searchUsersAndPosts(q: string): Promise<{ users: SearchedUser[], posts: SearchedPost[] }> {
  if (!q || q.length < 3) return { users: [], posts: [] };

  try {
    const usersRes = await query(
      `SELECT id, alias, CURRENT_DATE::date - created_at::date as age
     FROM users
     WHERE lower(alias) LIKE $1
     ORDER BY created_at DESC
     LIMIT 20`,
      [`%${q.toLowerCase()}%`]
    );

    const postsRes = await query(
      `SELECT p.id, p.title, u.alias as author
     FROM posts p
     JOIN users u ON u.id = p.user_id
     WHERE lower(p.title) LIKE $1
     ORDER BY p.created_at DESC
     LIMIT 20`,
      [`%${q.toLowerCase()}%`]
    );

    return {
      users: usersRes.rows,
      posts: postsRes.rows,
    };
  } catch (err) {
    logerror('searchUsersAndPosts error', [err]);
    return { users: [], posts: [] };
  }
}
