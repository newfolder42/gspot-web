import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { apiClient } from '@/lib/api';

// Configure how notifications appear when app is in foreground
// Only set in non-Expo-Go environments (SDK 53+ restriction)
if (Constants.executionEnvironment !== ExecutionEnvironment.StoreClient) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  // Remote push notifications are not supported in Expo Go (SDK 53+)
  // They require a development build or standalone app
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return null;

  // Push notifications do not work on simulators/emulators
  if (!Device.isDevice) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#14B8A6',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
  return tokenData.data;
}

export async function savePushToken(token: string): Promise<void> {
  try {
    await apiClient.post('/push-token', { token });
  } catch {
    // Non-fatal: token will be retried on next app open
  }
}
