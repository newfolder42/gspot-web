import { query } from '@/lib/db';
import { logerror } from '@/lib/logger';

export type NotificationSettings = {
  emailNotificationsEnabled: boolean;
};

export async function getNotificationSettings(userId: number): Promise<NotificationSettings | null> {
  try {
    const result = await query(
      'SELECT notifications FROM user_options WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return { emailNotificationsEnabled: true };
    }

    const notifications = result.rows[0].notifications;
    return {
      emailNotificationsEnabled: notifications?.email ?? true,
    };
  } catch (err) {
    await logerror('getNotificationSettings error:', [err]);
    return null;
  }
}

export async function setEmailNotifications(userId: number, enabled: boolean): Promise<boolean> {
  try {
    const existingResult = await query(
      'SELECT notifications FROM user_options WHERE user_id = $1',
      [userId]
    );

    let notifications = { email: enabled };
    if (existingResult.rows.length > 0) {
      notifications = { ...existingResult.rows[0].notifications, email: enabled };
    }

    await query(
      `INSERT INTO user_options (user_id, notifications)
       VALUES ($1, $2)
       ON CONFLICT (user_id)
       DO UPDATE SET
         notifications = $2,
         updated_at = CURRENT_TIMESTAMP`,
      [userId, JSON.stringify(notifications)]
    );

    return true;
  } catch (err) {
    await logerror('setEmailNotifications error:', [err]);
    return false;
  }
}
