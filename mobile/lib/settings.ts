import { apiClient } from '@/lib/api';

export type NotificationSettings = {
  emailNotificationsEnabled: boolean;
};

export const settingsApi = {
  get: (): Promise<NotificationSettings> =>
    apiClient.get<NotificationSettings>('/account/settings').then((r) => r.data),

  setEmailNotifications: (emailNotificationsEnabled: boolean): Promise<NotificationSettings> =>
    apiClient
      .patch<NotificationSettings>('/account/settings', { emailNotificationsEnabled })
      .then((r) => r.data),
};
