import { query } from '@/lib/db';
import { logerror } from './logger';

export type NotificationRecord = {
  id: number;
  userId: number;
  userAlias?: string;
  type: string;
  details: string;
  createdAt: Date;
  seen: number | null;
  seenAt: Date | null;
};

export async function getNotificationsForUser(userId: number, limit = 10): Promise<NotificationRecord[]> {
  try {
    if (!userId) return [];

    const res = await query(
      `SELECT 
        n.id,
        n.user_id as "userId",
        u.alias as "userAlias",
        n.type,
        n.details,
        n.created_at as "createdAt",
        n.seen,
        n.seen_at as "seenAt"
      FROM user_notifications n
      LEFT JOIN users u ON n.user_id = u.id
      WHERE n.user_id = $1
      ORDER BY n.created_at DESC
      LIMIT $2`,
      [userId, limit]
    );

    return res.rows;
  } catch (err) {
    await logerror('getNotificationsForUser error', [err]);
    return [];
  }
}

export async function markNotificationSeen(notificationId: number, userId: number) {
  try {
    if (!notificationId || !userId) return false;

    const res = await query(
      `UPDATE user_notifications
       SET seen = 1, seen_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [notificationId, userId]
    );

    return res.rows.length > 0;
  } catch (err) {
    await logerror('markNotificationSeen error', [err]);
    return false;
  }
}

export async function markNotificationUnseen(notificationId: number, userId: number) {
  try {
    if (!notificationId || !userId) return false;

    const res = await query(
      `UPDATE user_notifications
       SET seen = 0, seen_at = NULL
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [notificationId, userId]
    );

    return res.rows.length > 0;
  } catch (err) {
    await logerror('markNotificationUnseen error', [err]);
    return false;
  }
}

export async function createNotification(
  userId: number,
  type: string,
  details: Record<string, any>
): Promise<number | null> {
  try {
    if (!userId || !type || !details) return null;

    const res = await query(
      `INSERT INTO user_notifications (user_id, type, details)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [userId, type, JSON.stringify(details)]
    );

    return res.rows.length > 0 ? res.rows[0].id : null;
  } catch (err) {
    await logerror('createNotification error', [err]);
    return null;
  }
}
