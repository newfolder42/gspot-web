import { query } from '@/lib/db';
import { logerror } from './logger';

/**
 * A sitemap file may hold at most 50k URLs. We stay well under that with a
 * per-section cap; if any section ever approaches its cap, split the sitemap
 * with Next's `generateSitemaps` instead of raising these numbers.
 */
const POST_LIMIT = 20000;
const PROFILE_LIMIT = 5000;
const ZONE_LIMIT = 1000;

/**
 * "Publicly visible" means exactly what `getPostSeoMeta` enforces before it will
 * render metadata for a post: published, and living in a public zone.
 */
const PUBLIC_POST_WHERE = `p.status = 'published' and z.visibility = 'public'`;

export type SitemapEntry = { path: string; lastModified: Date };

export async function getSitemapPosts(): Promise<SitemapEntry[]> {
  try {
    const res = await query(
      `select p.id, p.created_at
       from posts p
       join zones z on z.id = p.zone_id
       where ${PUBLIC_POST_WHERE}
       order by p.created_at desc
       limit $1`,
      [POST_LIMIT]
    );

    return res.rows.map(r => ({
      path: `/post/${r.id}`,
      lastModified: new Date(r.created_at),
    }));
  } catch (err) {
    await logerror('getSitemapPosts error', [err]);
    return [];
  }
}

/**
 * Only profiles with at least one publicly visible post — a profile with no
 * public content is an empty shell and does not belong in the index.
 */
export async function getSitemapProfiles(): Promise<SitemapEntry[]> {
  try {
    const res = await query(
      `select u.alias, max(p.created_at) as last_post_at
       from users u
       join posts p on p.user_id = u.id
       join zones z on z.id = p.zone_id
       where ${PUBLIC_POST_WHERE}
       group by u.alias
       order by last_post_at desc
       limit $1`,
      [PROFILE_LIMIT]
    );

    return res.rows.map(r => ({
      path: `/account/${encodeURIComponent(r.alias)}`,
      lastModified: new Date(r.last_post_at),
    }));
  } catch (err) {
    await logerror('getSitemapProfiles error', [err]);
    return [];
  }
}

export async function getSitemapZones(): Promise<SitemapEntry[]> {
  try {
    const res = await query(
      `select z.slug, coalesce(z.updated_at, z.created_at) as last_modified
       from zones z
       where z.visibility = 'public' and z.state = 'active'
       order by z.slug asc
       limit $1`,
      [ZONE_LIMIT]
    );

    return res.rows.map(r => ({
      path: `/zone/${encodeURIComponent(r.slug)}`,
      lastModified: new Date(r.last_modified),
    }));
  } catch (err) {
    await logerror('getSitemapZones error', [err]);
    return [];
  }
}
