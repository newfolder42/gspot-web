"use server";

import { query } from '@/lib/db';
import { logerror } from './logger';
import type { SearchedPost, SearchedUser, SearchedZone } from '@/types/searched';
import { getCurrentUser } from './session';

export async function quickSearch(q: string): Promise<{ users: SearchedUser[], posts: SearchedPost[], zones: SearchedZone[] }> {
  if (!q || q.length < 3) return { users: [], posts: [], zones: [] };

  var user = await getCurrentUser();

  try {
    const users = await query(
      `SELECT id, alias, CURRENT_DATE::date - created_at::date as age
     FROM users
     WHERE lower(alias) LIKE $1
     ORDER BY created_at DESC
     LIMIT 20`,
      [`%${q.toLowerCase()}%`]
    );

    const posts = await query(
      `SELECT p.id, p.title, u.alias as author
     FROM posts p
     JOIN users u ON u.id = p.user_id
     WHERE lower(p.title) LIKE $1 AND status = 'published'
     ORDER BY p.created_at DESC
     LIMIT 20`,
      [`%${q.toLowerCase()}%`]
    );

    const zones = user ? await query(
      `SELECT z.id, z.slug, z.description
     FROM zones z
     WHERE lower(z.slug) LIKE $1 and state = 'active'
     AND (z.visibility = 'public' or exists (
             select 1
             from zone_members zm
             where zm.zone_id = z.id and zm.user_id = $2 and zm.status = 'active'
           ))
     ORDER BY z.created_at DESC
     LIMIT 20`,
      [`%${q.toLowerCase()}%`, user.userId]
    ) : await query(
      `SELECT z.id, z.slug, z.description
     FROM zones z
     WHERE lower(z.slug) LIKE $1 and state = 'active' and z.visibility = 'public'
     ORDER BY z.created_at DESC
     LIMIT 20`,
      [`%${q.toLowerCase()}%`]
    );

    return {
      users: users.rows,
      posts: posts.rows,
      zones: zones.rows
    };
  } catch (err) {
    await logerror('quickSearch error', [err]);
    return { users: [], posts: [], zones: [] };
  }
}
