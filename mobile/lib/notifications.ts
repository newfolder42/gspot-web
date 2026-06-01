import { apiClient } from '@/lib/api';
import type { NotificationType } from '@/types/notification';

type NotificationsResponse = {
  notifications: NotificationType[];
};

type ApiErrorBody = { error?: string };

const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: 'ავტორიზაცია ამოიწურა. თავიდან შედი ანგარიშზე.',
  INVALID_INPUT: 'შეყვანილი მონაცემები არასწორია.',
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

export const notificationsApi = {
  load: (limit = 20, offset = 0): Promise<NotificationType[]> =>
    call(() =>
      apiClient
        .get<NotificationsResponse>('/notifications', { params: { limit, offset } })
        .then((r) => r.data.notifications)
    ),

  markAllAsRead: (): Promise<{ ok: boolean }> =>
    call(() => apiClient.post<{ ok: boolean }>('/notifications/mark-all-read').then((r) => r.data)),

  setSeen: (notificationId: string, seen: boolean): Promise<{ ok: boolean }> =>
    call(() =>
      apiClient.patch<{ ok: boolean }>(`/notifications/${notificationId}`, { seen }).then((r) => r.data)
    ),

  getUnreadCount: (): Promise<{ count: number; latestId: string | null }> =>
    call(() =>
      apiClient
        .get<{ count: number; latestId: string | null }>('/notifications/unread-count')
        .then((r) => r.data)
    ),
};
