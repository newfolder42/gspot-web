import { useEffect, useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { usersApi } from '@/lib/users';
import { formatTimePassed } from '@/lib/dates';
import type { NewUser } from '@/types/user';

const PAGE_SIZE = 20;

function UserCard({ user }: { user: NewUser }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/(app)/user/[alias]', params: { alias: user.alias } })}
      className="flex-row gap-2.5 mx-4 mb-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3"
    >
      <ProfileAvatar name={user.alias} photoUrl={user.profilePhoto?.url ?? null} size={48} shape="md" />
      <View className="flex-1 justify-center">
        <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-50" numberOfLines={1}>
          &apos;{user.alias}
        </Text>
        <Text className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          {formatTimePassed(user.createdAt)}
        </Text>
      </View>
    </Pressable>
  );
}

/** Mirrors web /new-users — most recently registered users, newest first. */
export default function NewUsersScreen() {
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({ title: 'ახალი მომხმარებლები' });
  }, [navigation]);

  const query = useInfiniteQuery({
    queryKey: ['new-users'],
    queryFn: ({ pageParam }) => usersApi.getNewUsers(PAGE_SIZE, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.users.length < PAGE_SIZE ? undefined : allPages.length * PAGE_SIZE,
  });

  const users = useMemo(() => query.data?.pages.flatMap((p) => p.users) ?? [], [query.data]);
  const total = query.data?.pages[0]?.total ?? null;

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
        <Text className="text-sm text-zinc-500 dark:text-zinc-400 text-center mb-4">
          ჩატვირთვა ვერ მოხერხდა
        </Text>
        <Pressable onPress={() => query.refetch()} className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
          <Text className="text-brand text-sm font-semibold">ხელახლა ცდა</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      className="flex-1 bg-zinc-50 dark:bg-zinc-950"
      data={users}
      keyExtractor={(u) => String(u.id)}
      renderItem={({ item }) => <UserCard user={item} />}
      contentContainerStyle={{ paddingTop: 12, paddingBottom: 32 }}
      ListHeaderComponent={
        total != null ? (
          <Text className="px-4 pb-3 text-sm text-zinc-500 dark:text-zinc-400">
            ბოლოს დარეგისტრირებული მომხმარებლები · სულ: {total}
          </Text>
        ) : null
      }
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
        if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
      }}
      ListFooterComponent={
        query.isFetchingNextPage ? (
          <View className="py-4">
            <ActivityIndicator color="#14B8A6" />
          </View>
        ) : null
      }
    />
  );
}
