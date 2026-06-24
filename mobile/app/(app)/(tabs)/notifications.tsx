import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Linking, Pressable, RefreshControl, Text, View } from 'react-native';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { notificationsApi } from '@/lib/notifications';
import { getNotificationContentMessage, getNotificationRoute, type NotificationType } from '@/types/notification';

const PAGE_SIZE = 20;
const NOTIFICATIONS_QUERY_KEY = ['notifications'] as const;

function formatTimeAgo(timestamp: string | null): string {
  if (!timestamp) return 'ახლახანს';

  const date = new Date(timestamp);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(diffMs / 86_400_000);

  if (minutes < 1) return 'ახლახანს';
  if (minutes < 60) return `${minutes} წუთის წინ`;
  if (hours < 24) return `${hours} საათის წინ`;
  return `${days} დღის წინ`;
}

function iconNameByType(type: NotificationType['type']): keyof typeof Feather.glyphMap {
  switch (type) {
    case 'gps-guess':
      return 'map-pin';
    case 'gps-photo-guess':
      return 'camera';
    case 'connection-created-gps-post':
      return 'image';
    case 'connection-created-quest-post':
      return 'star';
    case 'gps-post-failed':
      return 'alert-triangle';
    case 'user-started-following':
      return 'users';
    case 'user-achievement-achieved':
      return 'award';
    case 'post-comment-created':
      return 'message-circle';
    case 'zone-member-invitation':
      return 'compass';
    case 'zone-quest-objective-submitted':
      return 'camera';
    case 'zone-quest-objective-accepted':
      return 'check-circle';
    case 'zone-quest-objective-rejected':
      return 'x-circle';
    case 'zone-quest-completed':
      return 'star';
    case 'connection-completed-zone-quest':
      return 'star';
    default:
      return 'bell';
  }
}

async function openNotificationRoute(notification: NotificationType, router: ReturnType<typeof useRouter>) {
  const route = getNotificationRoute(notification);
  if (!route) return;

  const postMatch = route.match(/^\/post\/(\d+)/);
  if (postMatch) {
    router.push({ pathname: '/(app)/post/[id]', params: { id: postMatch[1] } });
    return;
  }

  const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? 'https://gspot.ge';
  const url = `${baseUrl.replace(/\/$/, '')}${route}`;
  await Linking.openURL(url);
}

function NotificationRow({
  item,
  onToggleSeen,
  onPress,
}: {
  item: NotificationType;
  onToggleSeen: (item: NotificationType) => void;
  onPress: (item: NotificationType) => void;
}) {
  return (
    <Pressable
      onPress={() => onPress(item)}
      className="relative pl-6 pr-4 py-2 border-b border-zinc-100 dark:border-zinc-800 active:bg-zinc-100 dark:active:bg-zinc-700"
    >
      {/* Unseen dot – matches web: left-2 top-4 h-1 w-1 bg-teal-600 */}
      {!item.seen ? (
        <View className="absolute left-2 top-4 w-1 h-1 rounded-full bg-teal-600" />
      ) : null}

      <View className="flex-row gap-3">
        <View className="pt-0.5">
          <Feather name={iconNameByType(item.type)} size={16} color="#71717A" />
        </View>

        <View className="flex-1">
          <Text className="text-sm text-zinc-600 dark:text-zinc-400 leading-5">{getNotificationContentMessage(item.type, item.details)}</Text>
          <View className="mt-1 flex-row items-center justify-between">
            <Text className="text-xs text-zinc-500">{formatTimeAgo(item.timestamp)}</Text>
            <Pressable onPress={() => onToggleSeen(item)} hitSlop={8}>
              <Text className="text-xs text-teal-600 dark:text-teal-400">{item.seen ? 'მონიშნე წაუკითხავად' : 'მონიშნე წაკითხულად'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [markingAll, setMarkingAll] = useState(false);

  const query = useInfiniteQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: ({ pageParam }) => notificationsApi.load(PAGE_SIZE, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return pages.flat().length;
    },
    refetchInterval: 20_000,
    staleTime: 10_000,
  });

  const allNotifications = useMemo(() => query.data?.pages.flat() ?? [], [query.data]);
  const unseenCount = allNotifications.reduce((acc, n) => acc + (n.seen ? 0 : 1), 0);

  const setSeenMutation = useMutation({
    mutationFn: ({ id, seen }: { id: string; seen: boolean }) => notificationsApi.setSeen(id, seen),
    onSuccess: (_res, vars) => {
      queryClient.setQueryData(NOTIFICATIONS_QUERY_KEY, (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: NotificationType[]) =>
            page.map((item) => (item.id === vars.id ? { ...item, seen: vars.seen } : item))
          ),
        };
      });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
    onError: (err) => {
      Alert.alert('შეცდომა', (err as Error).message);
    },
  });

  const markAllAsRead = async () => {
    if (unseenCount === 0) return;
    try {
      setMarkingAll(true);
      const res = await notificationsApi.markAllAsRead();
      if (!res.ok) throw new Error('ვერ მოხერხდა მონიშვნა');

      queryClient.setQueryData(NOTIFICATIONS_QUERY_KEY, (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: NotificationType[]) => page.map((item) => ({ ...item, seen: true }))),
        };
      });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    } catch (err) {
      Alert.alert('შეცდომა', (err as Error).message);
    } finally {
      setMarkingAll(false);
    }
  };

  const onPressItem = async (item: NotificationType) => {
    if (!item.seen) {
      await setSeenMutation.mutateAsync({ id: item.id, seen: true });
    }
    try {
      await openNotificationRoute(item, router);
    } catch {
      Alert.alert('ინფორმაცია', 'შეტყობინების ბმულის გახსნა ვერ მოხერხდა');
    }
  };

  if (query.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <ActivityIndicator size="large" color="#14B8A6" />
      </View>
    );
  }

  if (query.isError) {
    return (
      <View className="flex-1 items-center justify-center px-8 bg-zinc-50 dark:bg-zinc-950">
        <Text className="text-zinc-500 dark:text-zinc-400 text-sm text-center mb-4">შეტყობინებების ჩატვირთვა ვერ მოხერხდა</Text>
        <Pressable onPress={() => query.refetch()} className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
          <Text className="text-brand text-sm font-semibold">ხელახლა ცდა</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-zinc-50 dark:bg-zinc-950">
      <View className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex-row items-center justify-between">
        <Text className="text-base font-semibold text-zinc-900 dark:text-zinc-50">შეტყობინებები</Text>
        <Pressable onPress={markAllAsRead} disabled={markingAll || unseenCount === 0}>
          <Text className={`text-xs ${markingAll || unseenCount === 0 ? 'text-zinc-400' : 'text-teal-600 dark:text-teal-400'}`}>
            ყველას წაკითხულად მონიშვნა
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={allNotifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotificationRow
            item={item}
            onPress={onPressItem}
            onToggleSeen={(value) => setSeenMutation.mutate({ id: value.id, seen: !value.seen })}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching && !query.isFetchingNextPage}
            onRefresh={() => query.refetch()}
            colors={['#14B8A6']}
            tintColor="#14B8A6"
          />
        }
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) {
            query.fetchNextPage();
          }
        }}
        ListEmptyComponent={
          <View className="py-16 items-center">
            <Text className="text-sm text-zinc-500 dark:text-zinc-400">შეტყობინებები არ არის</Text>
          </View>
        }
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <View className="py-4">
              <ActivityIndicator color="#14B8A6" />
            </View>
          ) : null
        }
      />
    </View>
  );
}
