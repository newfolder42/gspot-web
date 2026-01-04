import { query } from '@/lib/db';
import { logerror } from './logger';
import type { ClientConnection } from '@/types/client-connection';

export async function getConnectionsForUserByAlias(userName: string): Promise<ClientConnection[]> {
  try {
    if (!userName) return [];

    const userRes = await query('SELECT id FROM users WHERE alias = $1', [userName]);
    if (userRes.rows.length === 0) return [];

    const userId = userRes.rows[0].id;

    const res = await query(
      `SELECT u.id, u.alias, u.name,
       upp.public_url as profile_photo_url
       FROM user_connections ucx
       JOIN users u on u.id = ucx.connection_id
       left join user_content upp on u.id = upp.user_id AND upp.type = 'profile-photo'
       WHERE ucx.user_id = $1
       ORDER BY ucx.created_at DESC
      `,
      [userId]
    );

    return res.rows.map((r) => ({
      id: r.id,
      alias: r.alias,
      name: r.name,
      profilePhoto: r.profile_photo_url ?? null,
    }));
  } catch (err) {
    logerror('getConnectionsForUserByAlias error', [err]);
    return [];
  }
}

export async function getConnecters(userId: number): Promise<ClientConnection[]> {
  try {
    const res = await query(
      `SELECT u.id, u.alias, u.name
FROM user_connections ucx
JOIN users u on u.id = ucx.user_id
WHERE ucx.connection_id = $1
ORDER BY ucx.created_at DESC
      `,
      [userId]
    );

    return res.rows.map((r) => ({
      id: r.id,
      alias: r.alias,
      name: r.name,
      profilePhoto: null,
    }));
  } catch (err) {
    logerror('getUserConnections error', [err]);
    return [];
  }
}

export async function connectionExists(userId: number, targetId: number, type = 'connection') {
  try {
    const res = await query('SELECT id FROM user_connections WHERE user_id = $1 AND connection_id = $2 AND type = $3',
      [userId, targetId, type]);
    return res.rows.length > 0 ? res.rows[0].id : null;
  } catch (err) {
    logerror('connectionExists error', [err]);
    return null;
  }
}

export async function createConnection(userId: number, targetId: number, type = 'connection') {
  try {
    const res = await query('INSERT INTO user_connections (user_id, type, connection_id) VALUES ($1, $2, $3) RETURNING id',
      [userId, type, targetId]);
    return res.rows[0] ?? null;
  } catch (err) {
    logerror('createConnection error', [err]);
    return null;
  }
}

export async function deleteConnection(userId: number, targetId: number, type = 'connection') {
  try {
    const res = await query('DELETE FROM user_connections WHERE user_id = $1 AND connection_id = $2 AND type = $3 RETURNING id',
      [userId, targetId, type]);
    return res.rows.length > 0;
  } catch (err) {
    logerror('deleteConnection error', [err]);
    return false;
  }
}
