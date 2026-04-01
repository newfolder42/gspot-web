"use server";

import { query } from '@/lib/db';

import type { ZoneBaseType, ZoneMemberInfo, ZoneSettingsRecord } from '@/types/zone';
import { logerror } from './logger';


export async function getZone(slug: string): Promise<ZoneBaseType | null> {
  try {
    const res = await query(
      `select 
        z.id, z.slug, z.name, z.description, z.visibility, z.join_policy, z.state, z.created_at, z.updated_at
       from zones z
       where z.slug = $1
       limit 1`,
      [slug]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: Number(r.id),
      slug: r.slug,
      name: r.name,
      description: r.description,
      visibility: r.visibility,
      join_policy: r.join_policy,
      state: r.state,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  } catch (err) {
    await logerror('getZone error', [err]);
    return null;
  }
}

export async function getZoneById(id: number): Promise<ZoneBaseType | null> {
  try {
    const res = await query(
      `select 
        z.id, z.slug, z.name, z.description, z.visibility, z.join_policy, z.state, z.created_at, z.updated_at
       from zones z
       where z.id = $1
       limit 1`,
      [id]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: Number(r.id),
      slug: r.slug,
      name: r.name,
      description: r.description,
      visibility: r.visibility,
      join_policy: r.join_policy,
      state: r.state,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  } catch (err) {
    await logerror('getZone error', [err]);
    return null;
  }
}

export async function getZoneMember(zoneId: number, userId: number): Promise<ZoneMemberInfo | null> {
  try {
    const res = await query(
      `select id, role, status, notifications, joined_at, last_seen_at
       from zone_members
       where zone_id = $1 AND user_id = $2
       limit 1`,
      [zoneId, userId]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: Number(r.id),
      role: r.role,
      status: r.status,
      notifications: r.notifications,
      joined_at: r.joined_at,
      last_seen_at: r.last_seen_at,
    };
  } catch (err) {
    await logerror('getZoneMember error', [err]);
    return null;
  }
}

export async function becomeZoneMember(zoneId: number, userId: number, role: string, status: string):
  Promise<boolean> {
  try {
    const res = await query(
      `INSERT INTO zone_members (zone_id, user_id, role, status)
  VALUES ($1, $2, $3, $4)
  ON CONFLICT (zone_id, user_id) 
  DO UPDATE SET 
    status = EXCLUDED.status
  RETURNING id`,
      [zoneId, userId, role, status]
    );

    if (res.rows.length === 0) return false;
    const id = res.rows[0].id;
    return id > 0;
  } catch (err) {
    await logerror('becomeZoneMember error', [err]);
    return false;
  }
}

export async function leaveZoneMember(zoneId: number, userId: number):
  Promise<boolean> {
  try {
    await query(
      `update zone_members
       set status = 'left'
       where zone_id = $1 and user_id = $2`,
      [zoneId, userId]
    );

    return true;
  } catch (err) {
    await logerror('becomeZoneMember error', [err]);
    return false;
  }
}

export async function getZoneMembers(zoneId: number):
  Promise<ZoneMemberInfo[]> {
  try {
    const res = await query(
      `select zm.id, zm.role, zm.status, zm.notifications, zm.joined_at, zm.last_seen_at,
       u.id, u.alias, upp.public_url as profile_photo_url
       from zone_members zm
       JOIN users u on u.id = zm.user_id
       left join user_content upp on u.id = upp.user_id AND upp.type = 'profile-photo'
       where zone_id = $1
       order by zm.joined_at desc
       limit 20`,
      [zoneId]
    );
    if (res.rows.length === 0) return [];
    return res.rows.map((r: any) => ({
      id: Number(r.id),
      role: r.role,
      status: r.status,
      notifications: r.notifications,
      joined_at: r.joined_at,
      last_seen_at: r.last_seen_at,
      user: {
        id: Number(r.id),
        alias: r.alias,
        profilePhoto: r.profile_photo_url ?? null,
      }
    }));
  } catch (err) {
    await logerror('getZoneMember error', [err]);
    return [];
  }
}

export async function getUserPostZones(userId: number): Promise<ZoneBaseType[]> {
  try {
    const res = await query(
      `select z.id, z.slug, z.name, z.description, z.visibility, z.join_policy, z.state, z.created_at, z.updated_at,
              zs.upload_rules
       from zones z
       left join zone_settings zs on zs.zone_id = z.id
       where z.state = 'active'
         and exists (
             select 1
             from zone_members zm
             where zm.zone_id = z.id and zm.user_id = $1 and zm.status = 'active'
           )
       order by case when z.slug = 'public' then 0 else 1 end, z.name asc`,
      [userId]
    );

    return res.rows.map((r: any) => ({
      id: Number(r.id),
      slug: r.slug,
      name: r.name,
      description: r.description,
      visibility: r.visibility,
      join_policy: r.join_policy,
      state: r.state,
      upload_rules: r.upload_rules,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  } catch (err) {
    await logerror('getUserPostZones error', [err]);
    return [];
  }
}

export async function getZoneSettings(zoneId: number): Promise<ZoneSettingsRecord | null> {
  try {
    const res = await query(
      `select z.zone_id, z.upload_rules, z.guess_scoring_rules
       from zone_settings z
       where z.zone_id = $1`,
      [zoneId]
    );

    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: Number(r.zone_id),
      upload_rules: r.upload_rules,
      guess_scoring_rules: r.guess_scoring_rules
    };
  } catch (err) {
    await logerror('getZoneSettings error', [err]);
    return null;
  }
}


export async function updateZoneSettings(zoneId: number, { description, join_policy, upload_rules, guess_scoring_rules }: { description: string, join_policy: string, upload_rules: string, guess_scoring_rules: string }): Promise<boolean> {
  try {
    // let notifications = { email: enabled };
    // if (existingResult.rows.length > 0) {
    //   notifications = { ...existingResult.rows[0].notifications, email: enabled };
    // }

    await query(
      `UPDATE zones SET
              description = $2,
              join_policy = $3,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $1`,
      [zoneId, description, join_policy]
    );

    await query(
      `INSERT INTO zone_settings (zone_id, upload_rules, guess_scoring_rules)
       VALUES ($1, $2, $3)
       ON CONFLICT (zone_id)
       DO UPDATE SET 
         upload_rules = $2,
         guess_scoring_rules = $3,
         updated_at = CURRENT_TIMESTAMP`,
      [zoneId, upload_rules, guess_scoring_rules]
    );

    return true;
  } catch (err) {
    await logerror('updateZoneSettings error', [err]);
    return false;
  }
}