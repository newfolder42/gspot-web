"use server";

import { getNotificationsForUser, markNotificationSeen, markNotificationUnseen } from "@/lib/notifications";

export interface NotificationType {
  id: string;
  type: 'gps-guess' | 'connection-created-gps-post' | 'gps-post-failed' | 'user-started-following';
  user: {
    userId: number;
    alias: string;
  };
  details: NotificationGpsGuessDetailsType | NotificationConnectionPublishedGpsPostDetailsType
  | NotificationGpsPostPublishFailedDetailsType | NotificationUserStartedFollowingDetailsType;
  timestamp: Date | null;
  seen: boolean;
  getContent(): string;
  getRoute(): string | null;
}

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

export type NotificationUserStartedFollowingDetailsType = {
  id: number,
  followerId: number,
  followerAlias: string,
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
      const type = row.type as 'gps-guess' | 'connection-created-gps-post' | 'gps-post-failed' | 'user-started-following';
      const details = normalizeDetails(row.details);

      const notif: NotificationType = {
        id: String(row.id),
        type,
        user: {
          userId: row.userId,
          alias: row.userAlias || "User",
        },
        timestamp: row.createdAt ? row.createdAt : new Date(),
        seen: row.seen === 1,
        details,
        getContent: () => getNotificationContentMessage(type, details),
        getRoute: () => getNotificationRoute(type, details),
      };

      return notif;
    });

    return mapped;
  }
  catch {
    return [];
  }
}

function getNotificationContentMessage(type: NotificationType['type'], details: NotificationType['details']): string {
  switch (type) {
    case 'gps-guess': {
      const d = details as NotificationGpsGuessDetailsType;
      return `შენს პოსტზე სცადეს გამოცნობა (${d.score} ქულა)`;
    }
    case 'connection-created-gps-post': {
      const d = details as NotificationConnectionPublishedGpsPostDetailsType;
      return `${d.userAlias}-მა დაპოსტა: ${d.title}`;
    }
    case 'gps-post-failed': {
      const d = details as NotificationGpsPostPublishFailedDetailsType;
      return `შენს პოსტი "${d.title}" ვერ განთავსდა (${d.reason}`;
    }
    case 'user-started-following': {
      const d = details as NotificationUserStartedFollowingDetailsType;
      return `გილოცავ, თქვენ შეგეძინათ ახალი ფოლოვერი ${d.followerAlias}`;
    }
    default:
      return "ახალი შეტყობინება";
  }
}

function getNotificationRoute(type: NotificationType['type'], details: NotificationType['details']): string | null {
  switch (type) {
    case 'gps-guess': {
      const d = details as NotificationGpsGuessDetailsType;
      return `/post/${d.postId}`;
    }
    case 'connection-created-gps-post': {
      const d = details as NotificationConnectionPublishedGpsPostDetailsType;
      return `/post/${d.postId}`;
    }
    case 'gps-post-failed': {
      const d = details as NotificationGpsPostPublishFailedDetailsType;
      return `/post/${d.postId}`;
    }
    case 'user-started-following': {
      const d = details as NotificationUserStartedFollowingDetailsType;
      return `/account/${d.followerAlias}`;
    }
    default:
      return null;
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
