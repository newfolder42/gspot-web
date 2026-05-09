"use server";

import { query } from '@/lib/db';
import type { ZoneTag } from '@/types/tag';
import { logerror } from './logger';

export async function getZoneTags(zoneId: number): Promise<ZoneTag[]> {
  try {
    const res = await query(
      `SELECT id, zone_id, name, color, sort_order, created_at
       FROM zone_tags
       WHERE zone_id = $1
       ORDER BY sort_order ASC, id ASC`,
      [zoneId]
    );
    return res.rows.map(r => ({
      id: Number(r.id),
      zone_id: Number(r.zone_id),
      name: r.name,
      color: r.color,
      sort_order: r.sort_order,
      created_at: r.created_at,
    }));
  } catch (err) {
    await logerror('getZoneTags error', [err]);
    return [];
  }
}

export async function createZoneTag(
  zoneId: number,
  name: string,
  color: string,
  sortOrder = 0,
): Promise<ZoneTag | null> {
  try {
    const res = await query(
      `INSERT INTO zone_tags (zone_id, name, color, sort_order)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (zone_id, name) DO NOTHING
       RETURNING id, zone_id, name, color, sort_order, created_at`,
      [zoneId, name.trim(), color, sortOrder]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: Number(r.id),
      zone_id: Number(r.zone_id),
      name: r.name,
      color: r.color,
      sort_order: r.sort_order,
      created_at: r.created_at,
    };
  } catch (err) {
    await logerror('createZoneTag error', [err]);
    return null;
  }
}

export async function isZoneTagInUse(tagId: number): Promise<boolean> {
  try {
    const res = await query(
      `SELECT 1 FROM post_tags WHERE tag_id = $1 LIMIT 1`,
      [tagId]
    );
    return (res.rowCount ?? 0) > 0;
  } catch (err) {
    await logerror('isZoneTagInUse error', [err]);
    return true;
  }
}

export async function deleteZoneTag(tagId: number, zoneId: number): Promise<boolean> {
  try {
    const res = await query(
      `DELETE FROM zone_tags WHERE id = $1 AND zone_id = $2`,
      [tagId, zoneId]
    );
    return (res.rowCount ?? 0) > 0;
  } catch (err) {
    await logerror('deleteZoneTag error', [err]);
    return false;
  }
}

/** Set (or replace) the tag on a post. Pass null tagId to remove the tag. */
export async function setPostTag(postId: number, tagId: number | null): Promise<boolean> {
  try {
    if (tagId === null) {
      await query(`DELETE FROM post_tags WHERE post_id = $1`, [postId]);
      return true;
    }
    await query(
      `INSERT INTO post_tags (post_id, tag_id)
       VALUES ($1, $2)
       ON CONFLICT (post_id) DO UPDATE SET tag_id = EXCLUDED.tag_id`,
      [postId, tagId]
    );
    return true;
  } catch (err) {
    await logerror('setPostTag error', [err]);
    return false;
  }
}
