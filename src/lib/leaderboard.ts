"use server";

import { query } from '@/lib/db';
import { logerror } from './logger';
import type { LeaderboardEntry } from '@/types/leaderboard';

export async function getLeaderboard(type: string, zoneSlug: string, limit = 50, offset = 0): Promise<LeaderboardEntry[]> {
  try {
    const res = await query(
      `select u.id as user_id, u.alias, l.rating, l.last_modified_at
       from leaderboards l
       join users u on u.id = l.user_id
       join zones z on z.id = l.zone_id
       where l.type = $1 and z.slug = $2
       order by l.rating desc, l.last_modified_at desc
       limit $3 offset $4`,
      [type, zoneSlug, limit, offset]
    );

    return res.rows.map((r: any) => ({
      userId: r.user_id,
      alias: r.alias,
      rating: r.rating ?? 0,
      lastModifiedAt: r.last_modified_at || null,
    }));
  } catch (err) {
    await logerror('getLeaderboard error', [err]);
    return [];
  }
}
