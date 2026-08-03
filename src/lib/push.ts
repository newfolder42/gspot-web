import { query } from '@/lib/db';
import { logerror } from '@/lib/logger';

const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send';

type ExpoPushTicket = {
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
};

export async function sendExpoPush(
  pushToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  // Expo push tokens look like ExponentPushToken[xxx]
  if (!pushToken?.startsWith('ExponentPushToken[')) return;

  try {
    const res = await fetch(EXPO_PUSH_API, {
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

    const json = (await res.json().catch(() => null)) as
      | { data?: ExpoPushTicket | ExpoPushTicket[] }
      | null;
    const ticket = Array.isArray(json?.data) ? json?.data[0] : json?.data;
    if (!ticket || ticket.status !== 'error') return;

    // App uninstalled or notifications revoked — drop the token instead of
    // retrying it on every future notification for this user.
    if (ticket.details?.error === 'DeviceNotRegistered') {
      await deletePushToken(pushToken);
      return;
    }

    await logerror('sendExpoPush ticket error', {
      error: ticket.details?.error ?? ticket.message,
    });
  } catch (err) {
    await logerror('sendExpoPush failed', [err]);
  }
}

/** Removes a token that is no longer deliverable. */
export async function deletePushToken(token: string): Promise<void> {
  try {
    await query(`DELETE FROM mobile_push_tokens WHERE token = $1`, [token]);
  } catch (err) {
    await logerror('deletePushToken error', [err]);
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
