"use server";

import { getNotificationsForUser, markNotificationSeen, markNotificationUnseen } from "@/lib/notifications";

export type NotificationType = {
  id: string;
  type: 'gps-guess' | 'connection-created-gps-post' | 'gps-post-failed';
  user: {
    userId: number;
    alias: string;
  };
  details: NotificationGpsGuessDetailsType | NotificationConnectionPublishedGpsPostDetailsType | NotificationGpsPostPublishFailedDetailsType;
  timestamp: string | null;
  seen: boolean;
};

export type NotificationGpsGuessDetailsType = {
  postId: number,
  userId: number,
  userAlias: string,
  score: number,
}

export type NotificationConnectionPublishedGpsPostDetailsType = {
  postId: number,
  userId: number,
  userAlias: string,
  postType: string,
  title: string,
}

export type NotificationGpsPostPublishFailedDetailsType = {
  postId: number,
  userId: number,
  userAlias: string,
  postType: string,
  title: string,
  reason: string,
}

// Normalize `details` to a plain object regardless of input shape.
// - If a JSON string, attempts to parse.
// - If already an object, returns as-is.
// - Otherwise or on failure, returns an empty object.
function normalizeDetails(value: unknown): NotificationType['details'] {
  if (value === null || value === undefined) return {} as NotificationType['details'];
  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return {} as NotificationType['details'];
    try {
      return JSON.parse(text) as NotificationType['details'];
    } catch {
      return {} as NotificationType['details'];
    }
  }
  if (typeof value === "object") {
    return (value ?? {}) as NotificationType['details'];
  }
  return {} as NotificationType['details'];
}

export async function loadNotifications(userId: number, limit = 10): Promise<NotificationType[]> {
  try {
    const rows = await getNotificationsForUser(userId, limit);

    const mapped = rows.map((row) => {
      const notif = {
        id: String(row.id),
        type: row.type as 'gps-guess' | 'connection-created-gps-post' | 'gps-post-failed',
        user: {
          userId: row.userId,
          alias: row.userAlias || "User",
        },
        timestamp: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
        seen: row.seen === 1,
      };

      // Treat details uniformly; components can discriminate by `type`
      const details = normalizeDetails(row.details);
      return { ...notif, details };
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
