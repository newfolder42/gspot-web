import { apiClient } from '@/lib/api';
import type { FeedEvent, FeedEventBubble, FeedEventViewer, OwnFeedEvent } from '@/types/feed-event';

type ApiErrorBody = { error?: string };

const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: 'ავტორიზაცია ამოიწურა. თავიდან შედი ანგარიშზე.',
  INVALID_INPUT: 'შეყვანილი მონაცემები არასწორია.',
  NOT_ALLOWED: 'ამ ამბავზე რეაქცია ვერ დაფიქსირდა.',
  SERVER_ERROR: 'სერვერის შეცდომა. სცადე მოგვიანებით.',
};

function toUserFacingError(err: unknown): Error {
  const body = (err as any)?.response?.data as ApiErrorBody | undefined;
  if (body?.error) {
    return new Error(ERROR_MESSAGES[body.error] ?? body.error);
  }
  return new Error('ქსელური შეცდომა. შეამოწმე ინტერნეტი.');
}

async function call<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    throw toUserFacingError(err);
  }
}

export const feedEventsApi = {
  /** The "ამბები" strip: preview bubbles from people you follow + your own events. */
  getStrip: (): Promise<{ bubbles: FeedEventBubble[]; own: OwnFeedEvent[] }> =>
    call(() =>
      apiClient
        .get<{ bubbles: FeedEventBubble[]; own: OwnFeedEvent[] }>('/feed/events')
        .then((r) => r.data)
    ),

  /** The events inside one bubble (one per user), unseen first then newest. */
  getGroup: (groupKey: string): Promise<FeedEvent[]> =>
    call(() =>
      apiClient
        .get<{ events: FeedEvent[] }>('/feed/events/group', { params: { groupKey } })
        .then((r) => r.data.events)
    ),

  markSeen: (eventId: number): Promise<void> =>
    call(() => apiClient.post(`/feed/events/${eventId}/seen`).then(() => undefined)),

  /** One-time upvote on someone else's event. Idempotent server-side. */
  react: (eventId: number): Promise<{ ok: boolean; reacted: boolean }> =>
    call(() =>
      apiClient
        .post<{ ok: boolean; reacted: boolean }>(`/feed/events/${eventId}/react`)
        .then((r) => r.data)
    ),

  /** Followers who viewed your own event. Empty unless you authored it. */
  getViewers: (eventId: number): Promise<FeedEventViewer[]> =>
    call(() =>
      apiClient
        .get<{ viewers: FeedEventViewer[] }>(`/feed/events/${eventId}/viewers`)
        .then((r) => r.data.viewers)
    ),
};
