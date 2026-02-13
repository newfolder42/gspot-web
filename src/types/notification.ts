export type NotificationType = {
  id: string;
  type: 'gps-guess' | 'connection-created-gps-post' | 'gps-post-failed' | 'user-started-following';
  user: {
    userId: number;
    alias: string;
  };
  details: NotificationGpsGuessDetailsType | NotificationConnectionPublishedGpsPostDetailsType
  | NotificationGpsPostPublishFailedDetailsType | NotificationUserStartedFollowingDetailsType;
  timestamp: string | null;
  seen: boolean;
}

export type NotificationGpsGuessDetailsType = {
  postId: number,
  userId: number,
  userAlias: string,
  score: number,
}

export type NotificationConnectionPublishedGpsPostDetailsType = {
  postId: number,
  authorId: number,
  authorAlias: string,
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
export function normalizeDetails(value: unknown): NotificationType['details'] {
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

export function getNotificationContentMessage(type: NotificationType['type'], details: NotificationType['details']): string {
  switch (type) {
    case 'gps-guess': {
      const d = details as NotificationGpsGuessDetailsType;
      return `შენს პოსტზე სცადეს გამოცნობა (${d.score} ქულა)`;
    }
    case 'connection-created-gps-post': {
      const d = details as NotificationConnectionPublishedGpsPostDetailsType;
      const title = d.title?.trim();
      return title 
        ? `${d.authorAlias}-მა გამოაქვეყნა: ${title}`
        : `${d.authorAlias}-მა გამოაქვეყნა ახალი პოსტი`;
    }
    case 'gps-post-failed': {
      const d = details as NotificationGpsPostPublishFailedDetailsType;
      const title = d.title?.trim();
      return title
        ? `შენს პოსტი "${title}" ვერ განთავსდა (${d.reason}`
        : `შენს პოსტი ვერ განთავსდა (${d.reason}`;
    }
    case 'user-started-following': {
      const d = details as NotificationUserStartedFollowingDetailsType;
      return `გილოცავ, შენ შეგეძინა ახალი ფოლოვერი ${d.followerAlias}`;
    }
    default:
      return "ახალი შეტყობინება";
  }
}

export function getNotificationRoute(type: NotificationType['type'], details: NotificationType['details']): string | null {
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