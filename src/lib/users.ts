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

    return res.rows.map((r: any) => ({
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