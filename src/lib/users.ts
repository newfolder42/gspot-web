import { query } from '@/lib/db';
import { logerror } from './logger';
import { NewUser } from '@/types/user';

export async function getUserIdByAlias(userName: string) {
  try {
    if (!userName) return null;
    const res = await query('SELECT id FROM users WHERE alias = $1', [userName]);
    return res.rows.length > 0 ? res.rows[0].id : null;
  } catch (err) {
    await logerror('getUserIdByAlias error', [err]);
    return null;
  }
}

export async function getUserIdByEMail(email: string) {
  try {
    if (!email) return null;
    const res = await query('SELECT id, alias, email FROM users WHERE email = $1', [email]);
    return res.rows.length > 0 ? res.rows[0] : null;
  } catch (err) {
    await logerror('getUserIdByAlias error', [err]);
    return null;
  }
}

export async function getTotalUsers(): Promise<number> {
  try {
    const res = await query('select count(*) as total from users');
    return Number(res.rows[0]?.total ?? 0);
  } catch (err) {
    await logerror('getTotalUsers error', [err]);
    return 0;
  }
}

export async function getUserLevel(userId: number): Promise<number> {
  try {
    const res = await query(
      `SELECT level FROM user_xp WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    return res.rows.length > 0 ? Number(res.rows[0].level) : 0;
  } catch (err) {
    await logerror('getUserLevel error', [err]);
    return 0;
  }
}

export async function getUserIdByAliasWithLevel(alias: string): Promise<{ id: number; level: number } | null> {
  try {
    const res = await query(
      `SELECT u.id, COALESCE(ux.level, 0) as level
       FROM users u
       LEFT JOIN user_xp ux ON ux.user_id = u.id
       WHERE u.alias = $1
       LIMIT 1`,
      [alias]
    );
    if (res.rows.length === 0) return null;
    return { id: Number(res.rows[0].id), level: Number(res.rows[0].level) };
  } catch (err) {
    await logerror('getUserIdByAliasWithLevel error', [err]);
    return null;
  }
}

export async function getNewUsers(limit = 20, offset = 0): Promise<NewUser[]> {
  try {
    const res = await query(
      `select u.id, u.alias, u.created_at, upp.public_url as profile_photo_url
       from users u
       left join user_content upp on u.id = upp.user_id AND upp.type = 'profile-photo'
       order by u.created_at desc, u.id desc
       limit $1 offset $2`,
      [limit, offset]
    );

    return res.rows.map(r => ({
      id: +r.id,
      alias: r.alias,
      createdAt: r.created_at || null,
      profilePhoto: r.profile_photo_url ? { url: r.profile_photo_url } : null,
    }));
  } catch (err) {
    await logerror('getNewUsers error', [err]);
    return [];
  }
}