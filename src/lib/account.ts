import { query } from '@/lib/db';
import { logerror } from './logger';

export async function getAccountByAlias(userName: string, currentUserId: number | null) {
  try {
    if (!userName) return null;

    const userRes = await query(
      `SELECT u.id, u.alias, u.email, u.created_at, CURRENT_DATE::date - u.created_at::date as age,
       upp.id as profile_photo_id, upp.public_url as profile_photo_url,
       ucon.id as connection_id, ucon.created_at as connection_created_at
FROM users u
left join user_content upp on u.id = upp.user_id AND upp.type = 'profile-photo'
left join user_connections ucon on ucon.user_id = $2 AND ucon.connection_id = u.id
WHERE u.alias = $1`,
      [userName, currentUserId]
    );

    if (userRes.rows.length === 0) return null;

    const user = userRes.rows[0];
    const isOwnProfile = currentUserId == user.id;

    return {
      user: {
        id: user.id,
        alias: user.alias,
        email: user.email,
        age: user.age,
        created_at: user.created_at,
      },
      profilePhoto: user.profile_photo_id ? {
        id: user.profile_photo_id,
        url: user.profile_photo_url,
      } : null,
      connection: user.connection_id ? {
        id: user.connection_id,
        createdAt: user.connection_created_at,
      } : null,
      isOwnProfile,
    };
  } catch (err) {
    await logerror('getAccountByAlias error', [err]);
    return null;
  }
}
