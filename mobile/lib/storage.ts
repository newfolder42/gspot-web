import * as SecureStore from 'expo-secure-store';

const KEYS = {
  ACCESS_TOKEN: 'gspot_access_token',
  REFRESH_TOKEN: 'gspot_refresh_token',
  USER: 'gspot_user',
  PUSH_TOKEN: 'gspot_push_token',
  DEVICE_KEY: 'gspot_device_key',
  DISMISSED_UPDATE: 'gspot_dismissed_update',
} as const;

export type StoredUser = {
  id: number;
  alias: string;
  email: string;
};

export const storage = {
  async getAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync(KEYS.ACCESS_TOKEN);
  },

  async getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(KEYS.REFRESH_TOKEN);
  },

  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    await Promise.all([
      SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, accessToken),
      SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, refreshToken),
    ]);
  },

  async getUser(): Promise<StoredUser | null> {
    const raw = await SecureStore.getItemAsync(KEYS.USER);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredUser;
    } catch {
      return null;
    }
  },

  async setUser(user: StoredUser): Promise<void> {
    await SecureStore.setItemAsync(KEYS.USER, JSON.stringify(user));
  },

  /** The Expo push token last accepted by the server, kept so logout can unregister it. */
  async getPushToken(): Promise<string | null> {
    return SecureStore.getItemAsync(KEYS.PUSH_TOKEN);
  },

  async setPushToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(KEYS.PUSH_TOKEN, token);
  },

  async deletePushToken(): Promise<void> {
    await SecureStore.deleteItemAsync(KEYS.PUSH_TOKEN);
  },

  /**
   * Random id created once per install, so the version check can count a device
   * once instead of adding a row on every app open. Survives logout on purpose.
   */
  async getDeviceKey(): Promise<string> {
    const existing = await SecureStore.getItemAsync(KEYS.DEVICE_KEY);
    if (existing) return existing;
    const key = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    await SecureStore.setItemAsync(KEYS.DEVICE_KEY, key);
    return key;
  },

  /** The version whose update notice was dismissed, so it is shown only once. */
  async getDismissedUpdate(): Promise<string | null> {
    return SecureStore.getItemAsync(KEYS.DISMISSED_UPDATE);
  },

  async setDismissedUpdate(version: string): Promise<void> {
    await SecureStore.setItemAsync(KEYS.DISMISSED_UPDATE, version);
  },

  async clear(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(KEYS.ACCESS_TOKEN),
      SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN),
      SecureStore.deleteItemAsync(KEYS.USER),
      SecureStore.deleteItemAsync(KEYS.PUSH_TOKEN),
    ]);
  },
};
