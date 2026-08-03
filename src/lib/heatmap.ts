"use server";

import { query } from '@/lib/db';
import { getCurrentUser } from './session';
import { logerror } from './logger';
import type { HeatmapDataType, HeatmapPointType } from '@/types/heatmap';
import { heatmapGridMeters, heatmapGridSteps } from '@/lib/map';

const HEATMAP_POST_TYPES = ['gps-photo', 'quest-completion'];

const NUMERIC_TEXT = `~ '^-?[0-9]+(\\.[0-9]+)?$'`;

function buildPoints(rows: any[]): HeatmapPointType[] {
  const points: HeatmapPointType[] = [];

  for (const r of rows) {
    const lat = Number(r.lat);
    const lng = Number(r.lng);
    const weight = Number(r.weight);
    if (!isFinite(lat) || !isFinite(lng)) continue;
    if (lat === 0 && lng === 0) continue;

    points.push({ latitude: lat, longitude: lng, weight: isFinite(weight) && weight > 0 ? weight : 1 });
  }

  return points;
}

// Web entry point — the mobile API calls getPostsHeatmapForUser directly.
export async function getOwnPostsHeatmap(accountUserId: number): Promise<HeatmapDataType> {
  const user = await getCurrentUser();
  if (!user) return { points: [], totalPosts: 0 };
  if (Number(user.userId) !== Number(accountUserId)) return { points: [], totalPosts: 0 };
  return getPostsHeatmapForUser(accountUserId);
}

// A single user's own post heatmap. Callers must have already established that
// the viewer is that user — this is never another account's data.
export async function getPostsHeatmapForUser(accountUserId: number): Promise<HeatmapDataType> {
  try {
    const ownSteps = heatmapGridSteps(heatmapGridMeters);

    const res = await query(
      `with coords as (
         select
           p.id as post_id,
           (uc.details #>> '{coordinates,latitude}') as lat_txt,
           (uc.details #>> '{coordinates,longitude}') as lng_txt
         from posts p
         join post_content pc on pc.post_id = p.id
         join user_content uc on uc.id = pc.content_id
         where p.user_id = $1
           and p.status = 'published'
           and p.deleted_at is null
           and p.type = any($2::varchar[])
       ),
       valid as (
         select post_id, lat_txt::numeric as lat, lng_txt::numeric as lng
         from coords
         where lat_txt ${NUMERIC_TEXT} and lng_txt ${NUMERIC_TEXT}
       )
       select
         round(round(lat / $3::numeric) * $3::numeric, 6) as lat,
         round(round(lng / $4::numeric) * $4::numeric, 6) as lng,
         count(*) as weight,
         (select count(distinct post_id) from valid) as total_posts
       from valid
       group by 1, 2`,
      [accountUserId, HEATMAP_POST_TYPES, ownSteps.lat, ownSteps.lng]
    );

    return {
      points: buildPoints(res.rows),
      totalPosts: Number(res.rows[0]?.total_posts ?? 0),
    };
  } catch (err) {
    await logerror('getPostsHeatmapForUser error', [err]);
    return { points: [], totalPosts: 0 };
  }
}

// the site wide scan touches every published post, so it is reused for a few minutes
const GLOBAL_CACHE_TTL_MS = 5 * 60 * 1000;
let globalCache: { data: HeatmapDataType; expiresAt: number } | null = null;

/**
 * Site wide heatmap of every published post in a public zone, snapped to a coarse
 * grid so single posts cannot be pinpointed and the payload stays small.
 */
export async function getGlobalPostsHeatmap(): Promise<HeatmapDataType> {
  if (globalCache && globalCache.expiresAt > Date.now()) {
    return globalCache.data;
  }

  try {
    const globalSteps = heatmapGridSteps(heatmapGridMeters);

    const res = await query(
      `with coords as (
         select
           p.id as post_id,
           (uc.details #>> '{coordinates,latitude}') as lat_txt,
           (uc.details #>> '{coordinates,longitude}') as lng_txt
         from posts p
         join zones z on z.id = p.zone_id
         join post_content pc on pc.post_id = p.id
         join user_content uc on uc.id = pc.content_id
         where p.status = 'published'
           and p.deleted_at is null
           and p.type = any($1::varchar[])
           and z.visibility = 'public'
       ),
       valid as (
         select post_id, lat_txt::numeric as lat, lng_txt::numeric as lng
         from coords
         where lat_txt ${NUMERIC_TEXT} and lng_txt ${NUMERIC_TEXT}
       )
       select
         round(round(lat / $2::numeric) * $2::numeric, 6) as lat,
         round(round(lng / $3::numeric) * $3::numeric, 6) as lng,
         count(*) as weight,
         (select count(distinct post_id) from valid) as total_posts
       from valid
       group by 1, 2`,
      [HEATMAP_POST_TYPES, globalSteps.lat, globalSteps.lng]
    );

    const data: HeatmapDataType = {
      points: buildPoints(res.rows),
      totalPosts: Number(res.rows[0]?.total_posts ?? 0),
    };

    globalCache = { data, expiresAt: Date.now() + GLOBAL_CACHE_TTL_MS };

    return data;
  } catch (err) {
    await logerror('getGlobalPostsHeatmap error', [err]);
    return { points: [], totalPosts: 0 };
  }
}
