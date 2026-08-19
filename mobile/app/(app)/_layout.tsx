import { useEffect } from 'react';
import { Stack, Redirect, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import {
  markPushNotificationRead,
  registerForPushNotificationsAsync,
  savePushToken,
} from '@/lib/pushNotifications';
import { openPushNotification } from '@/lib/notificationRouting';

/**
 * A cold start replays the tap that launched the app. Remembering which one we
 * already routed keeps a remount from navigating away a second time.
 */
let handledColdStartId: string | null = null;

export default function AppLayout() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;
    registerForPushNotificationsAsync()
      .then((token) => { if (token) savePushToken(token); })
      .catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;

    const refreshBadge = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };

    const handleTap = (response: Notifications.NotificationResponse) => {
      const { data } = response.notification.request.content;
      // Opening the push is the user reading it — clear it server-side, then
      // refresh so the tab badge and the list agree.
      markPushNotificationRead(data).finally(refreshBadge);
      openPushNotification(data, router).catch(() => {});
    };

    // Tapped while the app was running (foreground or background)
    const tapSub = Notifications.addNotificationResponseReceivedListener(handleTap);

    // Arrived while the app was open — the tab badge is otherwise up to 20s stale
    const receiveSub = Notifications.addNotificationReceivedListener(refreshBadge);

    // Tapped while the app was closed
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!response) return;
        const id = response.notification.request.identifier;
        if (handledColdStartId === id) return;
        handledColdStartId = id;
        handleTap(response);
      })
      .catch(() => {});

    return () => {
      tapSub.remove();
      receiveSub.remove();
    };
  }, [user?.id, router, queryClient]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <ActivityIndicator size="large" color="#14B8A6" />
      </View>
    );
  }

  if (!user) return <Redirect href="/(auth)/login" />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#18181B' },
        headerTintColor: '#EDEDED',
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerShadowVisible: false,
        headerRight: () => (
          <Pressable onPress={() => router.push('/(app)/search')} style={{ marginRight: 4 }}>
            <Feather name="search" size={20} color="#A1A1AA" />
          </Pressable>
        ),
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="post/[id]" options={{ title: 'პოსტი' }} />
      <Stack.Screen name="zone/[slug]/index" options={{ title: 'ზონა' }} />
      <Stack.Screen name="zone/[slug]/quests/[questId]" options={{ title: 'მისია' }} />
      <Stack.Screen name="zone/[slug]/characters/[characterSlug]" options={{ title: 'პერსონაჟი' }} />
      <Stack.Screen name="user/[alias]" options={{ title: 'პროფილი' }} />
      <Stack.Screen name="zones" options={{ title: 'საბზონები' }} />
      <Stack.Screen name="new-users" options={{ title: 'ახალი მომხმარებლები' }} />
      <Stack.Screen name="heatmap" options={{ title: 'პოსტების რუკა' }} />
      <Stack.Screen name="about" options={{ title: 'ჩვენ შესახებ', headerRight: () => null }} />
      <Stack.Screen name="quest-log" options={{ title: 'მისიების ჟურნალი', headerRight: () => null }} />
      <Stack.Screen name="search" options={{ headerTitle: 'ძებნა', headerRight: () => null }} />
      <Stack.Screen name="settings" options={{ title: 'პარამეტრები', headerRight: () => null }} />
    </Stack>
  );
}
