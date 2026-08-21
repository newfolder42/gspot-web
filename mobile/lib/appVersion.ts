import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import axios from 'axios';
import { storage } from '@/lib/storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://gspot.ge';

export type VersionCheckResponse = {
  latestVersion: string;
  updateAvailable: boolean;
  updateRequired: boolean;
  notes: string | null;
};

/** The version from app.json — the single place a release is stamped. */
export function currentAppVersion(): string {
  return Constants.expoConfig?.version ?? '0.0.0';
}

/**
 * Reports this install to the server and gets the released version back.
 * Deliberately not on `apiClient`: it has to work on the login screen too, and a
 * 401 here must not kick off a token refresh. The token is attached by hand when
 * there is one, so the check-in can be linked to the user.
 */
export async function checkAppVersion(): Promise<VersionCheckResponse | null> {
  try {
    const [deviceKey, accessToken] = await Promise.all([
      storage.getDeviceKey(),
      storage.getAccessToken(),
    ]);

    const { data } = await axios.post<VersionCheckResponse>(
      `${API_BASE_URL}/api/v1/app-version`,
      {
        deviceKey,
        platform: Platform.OS,
        appVersion: currentAppVersion(),
        osVersion: Device.osVersion ?? String(Platform.Version),
        deviceModel: Device.modelName,
      },
      {
        timeout: 10_000,
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      }
    );

    return data;
  } catch {
    // Non-fatal: no network, no nag.
    return null;
  }
}
