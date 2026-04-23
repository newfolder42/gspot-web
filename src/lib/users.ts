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

export async function getNewUsers(limit = 20, offset = 0): Promise<NewUser[]> {
  try {
    const res = await query(
      `select u.id, u.alias, u.created_at, upp.public_url as profile_photo_url,
              coalesce(ux.level, 0) as level,
              (
                select count(*)
                from user_achievements ua
                where ua.user_id = u.id and ua.status = 'achieved'
              ) as achievements_achieved,
              (
                select count(*)
                from posts p
                where p.user_id = u.id and p.status = 'published'
              ) as posts_created
       from users u
       left join user_content upp on u.id = upp.user_id AND upp.type = 'profile-photo'
       left join user_xp ux on ux.user_id = u.id
       order by u.created_at desc, u.id desc
       limit $1 offset $2`,
      [limit, offset]
    );

    return res.rows.map((r: any) => ({
      id: +r.id,
      alias: r.alias,
      createdAt: r.created_at || null,
      profilePhoto: r.profile_photo_url ? { url: r.profile_photo_url } : null,
      level: Number(r.level ?? 0),
      achievementsAchieved: Number(r.achievements_achieved ?? 0),
      postsCreated: Number(r.posts_created ?? 0),
    }));
  } catch (err) {
    await logerror('getNewUsers error', [err]);
    return [];
  }
}