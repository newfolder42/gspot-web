import { useEffect } from 'react';
import { Stack, Redirect, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { registerForPushNotificationsAsync, savePushToken } from '@/lib/pushNotifications';

/**
 * Root Stack navigator for the authenticated (app) group.
 * - (tabs)  — the bottom-tab shell (headerShown: false so tabs manage their own headers)
 * - post/[id] — Stack screen so back() correctly returns to whichever tab pushed it
 * - zone/[slug] — zone feed
 * - user/[alias] — public profile
 */
export default function AppLayout() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;
    registerForPushNotificationsAsync()
      .then((token) => { if (token) savePushToken(token); })
      .catch(() => {});
  }, [user?.id]);

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
      <Stack.Screen name="zone/[slug]" options={{ title: 'ზონა' }} />
      <Stack.Screen name="user/[alias]" options={{ title: 'პროფილი' }} />
      <Stack.Screen name="zones" options={{ title: 'საბზონები' }} />
      <Stack.Screen name="search" options={{ headerTitle: 'ძებნა', headerRight: () => null }} />
    </Stack>
  );
}
