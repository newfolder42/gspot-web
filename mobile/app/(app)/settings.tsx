import { ActivityIndicator, Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { settingsApi } from '@/lib/settings';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, useTheme } from '@/constants/colors';

export default function SettingsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['account-settings'],
    queryFn: () => settingsApi.get(),
  });

  const mutation = useMutation({
    mutationFn: (enabled: boolean) => settingsApi.setEmailNotifications(enabled),
    onMutate: (enabled) => {
      const prev = queryClient.getQueryData(['account-settings']);
      queryClient.setQueryData(['account-settings'], { emailNotificationsEnabled: enabled });
      return { prev };
    },
    onError: (_err, _enabled, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['account-settings'], ctx.prev);
      Alert.alert('შეცდომა', 'პარამეტრების განახლება ვერ მოხერხდა.');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['account-settings'] }),
  });

  const handleLogout = () => {
    Alert.alert('გასვლა', 'დარწმუნებული ხარ, რომ გსურს გასვლა?', [
      { text: 'გაუქმება', style: 'cancel' },
      { text: 'გასვლა', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView className="flex-1 bg-zinc-50 dark:bg-zinc-950" contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}>
      {/* Notifications */}
      <View className="px-4 pt-5 pb-2">
        <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          შეტყობინებები
        </Text>
      </View>
      <View className="mx-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden">
        {isLoading ? (
          <View className="p-6 items-center"><ActivityIndicator color={Colors.brand} /></View>
        ) : isError ? (
          <View className="p-6 items-center">
            <Text className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">ჩატვირთვა ვერ მოხერხდა</Text>
            <Pressable onPress={() => refetch()} className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
              <Text className="text-brand text-sm font-semibold">ხელახლა ცდა</Text>
            </Pressable>
          </View>
        ) : (
          <View className="flex-row items-start gap-3 p-4">
            <Switch
              value={data?.emailNotificationsEnabled ?? true}
              onValueChange={(v) => mutation.mutate(v)}
              disabled={mutation.isPending}
              trackColor={{ false: theme.switchTrackOff, true: Colors.brand }}
              thumbColor={Colors.onAccent}
            />
            <View className="flex-1">
              <Text className="text-sm font-medium text-zinc-900 dark:text-zinc-100">იმეილით შეტყობინებები</Text>
              <Text className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                12 საათის წაუკითხავი შეტყობინებები მოგივა მეილზე
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Account */}
      <View className="px-4 pt-6 pb-2">
        <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          ანგარიში
        </Text>
      </View>
      <View className="mx-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden">
        <Pressable
          onPress={() => router.push('/(app)/quest-log')}
          className="flex-row items-center px-4 py-4 border-b border-zinc-100 dark:border-zinc-800 active:bg-zinc-50 dark:active:bg-zinc-800"
          android_ripple={{ color: theme.ripple }}
        >
          <Feather name="flag" size={18} color={theme.icon} />
          <Text className="text-zinc-800 dark:text-zinc-200 ml-3 text-base font-medium">მისიების ჟურნალი</Text>
          <Feather name="chevron-right" size={18} color={theme.icon} style={{ marginLeft: 'auto' }} />
        </Pressable>
        <Pressable
          onPress={handleLogout}
          className="flex-row items-center px-4 py-4 active:bg-zinc-50 dark:active:bg-zinc-800"
          android_ripple={{ color: theme.ripple }}
        >
          <Feather name="log-out" size={18} color={Colors.error} />
          <Text className="text-red-500 ml-3 text-base font-medium">გასვლა</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
