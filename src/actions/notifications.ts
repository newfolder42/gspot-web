"use server";

import { getNotificationsForUser, markNotificationSeen, markNotificationUnseen } from "@/lib/notifications";
import { normalizeDetails, NotificationType } from "@/types/notification";

export async function loadNotifications(userId: number, limit = 10): Promise<NotificationType[]> {
  try {
    const rows = await getNotificationsForUser(userId, limit);

    const mapped = rows.map((row) => {
      const type = row.type as 'gps-guess' | 'connection-created-gps-post' | 'gps-post-failed' | 'user-started-following';
      const details = normalizeDetails(row.details);

      const notif: NotificationType = {
        id: String(row.id),
        type,
        user: {
          userId: row.userId,
          alias: row.userAlias || "User",
        },
        timestamp: (row.createdAt ? row.createdAt : new Date()).toISOString(),
        seen: row.seen === 1,
        details,
      };

      return notif;
    });

    return mapped;
  }
  catch {
    return [];
  }
}

export async function markAsRead(userId: number, notificationId: string): Promise<{ ok: boolean }> {
  try {
    const success = await markNotificationSeen(Number(notificationId), userId);
    return { ok: success };
  }
  catch {
    return { ok: false };
  }
}

export async function markAsUnread(userId: number, notificationId: string): Promise<{ ok: boolean }> {
  try {
    const success = await markNotificationUnseen(Number(notificationId), userId);
    return { ok: success };
  }
  catch {
    return { ok: false };
  }
}
