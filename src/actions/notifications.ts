"use server";

import { getNotificationsForUser, markNotificationSeen, markNotificationUnseen } from "@/lib/notifications";

export type NotificationPayload = {
  id: string;
  userId: number;
  userAlias: string;
  details: string;
  createdAt: string | null;
  seen: boolean;
};

export async function loadNotifications(userId: number, limit = 10): Promise<NotificationPayload[]> {
  try {
    const rows = await getNotificationsForUser(userId, limit);

    const notifications: NotificationPayload[] = rows.map((row) => {
      switch (row.type) {
        case "gps-guess":
        default: {
          const details = row.details ?? {};
          const detailsText = typeof details === "string"
            ? details
            : JSON.stringify(details);

          return {
            id: String(row.id),
            userId: Number(row.userId),
            userAlias: row.userAlias || "User",
            details: detailsText,
            createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
            seen: row.seen === 1,
          }
        }
      }
    });

    return notifications;
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
