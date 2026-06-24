import { query } from '@/lib/db';
import { logerror } from './logger';
import { sendExpoPush, getPushTokensForUser } from './push';

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

export async function getNotificationsForUser(userId: number, limit = 10, offset = 0): Promise<NotificationRecord[]> {
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
      LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
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

export async function markAllNotificationsSeen(userId: number) {
  try {
    if (!userId) return false;
    
    await query(
      `UPDATE user_notifications
       SET seen = 1, seen_at = NOW()
       WHERE user_id = $1 AND seen IS DISTINCT FROM 1`,
      [userId]
    );

    return true;
  } catch (err) {
    await logerror('markAllNotificationsSeen error', [err]);
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

    const notifId = res.rows.length > 0 ? res.rows[0].id : null;

    // Fire push notification (non-blocking, errors are logged internally)
    sendPushForNotification(userId, type, details).catch(() => {});

    return notifId;
  } catch (err) {
    await logerror('createNotification error', [err]);
    return null;
  }
}

async function sendPushForNotification(userId: number, type: string, details: Record<string, any>) {
  const tokens = await getPushTokensForUser(userId);
  if (tokens.length === 0) return;

  let body = 'ახალი შეტყობინება';
  switch (type) {
    case 'gps-guess':
      body = `${details.userAlias}-მა სცადა გამოცნობა (${details.score} ქულა)`;
      break;
    case 'gps-photo-guess':
      body = `${details.userAlias}-მა სცადა გამოცნობა ფოტოთი (${details.score} ქულა)`;
      break;
    case 'connection-created-gps-post': {
      const title = details.title?.trim();
      body = title ? `${details.authorAlias}-მა გამოაქვეყნა: ${title}` : `${details.authorAlias}-მა გამოაქვეყნა ახალი პოსტი`;
      break;
    }
    case 'connection-created-quest-post':
      body = `${details.authorAlias}-მა შეასრულა მისია: ${details.title}`;
      break;
    case 'gps-post-failed': {
      const title = details.title?.trim();
      body = title ? `პოსტი "${title}" ვერ განთავსდა` : 'შენი პოსტი ვერ განთავსდა';
      break;
    }
    case 'user-started-following':
      body = `ახალი ფოლოვერი: ${details.followerAlias}`;
      break;
    case 'user-achievement-achieved':
      body = `ახალი მიღწევა: ${details.milestoneName ?? details.achievementName}`;
      break;
    case 'post-comment-created':
      body = details.parent
        ? `${details.commenterAlias}-მა დაგიტოვა კომენტარი`
        : `${details.commenterAlias}-მა დატოვა კომენტარი`;
      break;
    case 'zone-quest-completed':
      body = `მისია შესრულებულია: ${details.questTitle}`;
      break;
    case 'zone-quest-objective-rejected':
      body = `ამოცანა "${details.objectiveTitle ?? ''}" დაიწუნა, სცადე თავიდან`;
      break;
    case 'zone-quest-objective-accepted':
      body = `ამოცანა "${details.objectiveTitle ?? ''}" დადასტურდა`;
      break;
    case 'zone-quest-objective-submitted':
      body = `${details.submitterAlias}-მა გამოაგზავნა "${details.objectiveTitle ?? ''}" შესაფასებლად`;
      break;
    case 'connection-completed-zone-quest':
      body = `${details.userAlias}-მა შეასრულა მისია: ${details.questTitle}`;
      break;
  }

  await Promise.all(tokens.map((t) => sendExpoPush(t, 'G\'Spot', body, { type, ...details })));
}
