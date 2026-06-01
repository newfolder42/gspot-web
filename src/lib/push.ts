import { query } from '@/lib/db';
import { logerror } from '@/lib/logger';

const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send';

export async function sendExpoPush(
  pushToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  // Expo push tokens look like ExponentPushToken[xxx]
  if (!pushToken?.startsWith('ExponentPushToken[')) return;

  try {
    await fetch(EXPO_PUSH_API, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: pushToken,
        sound: 'default',
        title,
        body,
        data: data ?? {},
      }),
    });
  } catch (err) {
    await logerror('sendExpoPush failed', [err]);
  }
}

/** Returns all push tokens registered for a given user. */
export async function getPushTokensForUser(userId: number): Promise<string[]> {
  try {
    const res = await query(
      `SELECT token FROM mobile_push_tokens WHERE user_id = $1`,
      [userId]
    );
    return res.rows.map((r: { token: string }) => r.token);
  } catch {
    return [];
  }
}
