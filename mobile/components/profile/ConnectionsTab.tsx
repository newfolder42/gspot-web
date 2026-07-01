import type { ReactElement } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { FollowButton } from '@/components/profile/FollowButton';
import { usersApi } from '@/lib/users';
import { formatTimePassed } from '@/lib/dates';
import type { ClientConnection } from '@/types/connection';

function ConnectionRow({ connection, canUnfollow }: { connection: ClientConnection; canUnfollow: boolean }) {
  const router = useRouter();
  return (
    <View className="flex-row items-center px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
      <Pressable
        className="flex-row items-center gap-3 flex-1"
        onPress={() => router.push({ pathname: '/(app)/user/[alias]', params: { alias: connection.alias } })}
      >
        <ProfileAvatar name={connection.alias} photoUrl={connection.profilePhoto ?? null} size={48} shape="md" />
        <View className="flex-1">
          <Text className="text-sm font-medium text-zinc-900 dark:text-zinc-100">&apos;{connection.alias}</Text>
          <Text className="text-xs text-zinc-500 dark:text-zinc-400">{formatTimePassed(connection.createdAt)}</Text>
        </View>
      </Pressable>
      {canUnfollow ? <FollowButton alias={connection.alias} initialFollowing size="sm" /> : null}
    </View>
  );
}

/**
 * Connections list, virtualized via FlatList so each row's avatar image and
 * FollowButton are only mounted while on screen. The profile header rides along
 * as ListHeaderComponent and stays visible through loading/error/empty states.
 */
export function ConnectionsTab({
  alias,
  isOwn,
  header,
}: {
  alias: string;
  isOwn: boolean;
  header: ReactElement;
}) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['connections', alias],
    queryFn: () => usersApi.getConnections(alias),
    enabled: !!alias,
  });

  return (
    <FlatList
      className="flex-1 bg-zinc-50 dark:bg-zinc-950"
      data={data ?? []}
      keyExtractor={(c) => c.alias}
      ListHeaderComponent={header}
      contentContainerStyle={{ paddingBottom: 40 }}
      initialNumToRender={10}
      windowSize={7}
      removeClippedSubviews
      renderItem={({ item }) => <ConnectionRow connection={item} canUnfollow={isOwn} />}
      ListEmptyComponent={
        isLoading ? (
          <View className="py-10 items-center"><ActivityIndicator color="#14B8A6" /></View>
        ) : isError ? (
          <View className="py-10 items-center px-8">
            <Text className="text-sm text-zinc-500 dark:text-zinc-400 mb-3 text-center">ჩატვირთვა ვერ მოხერხდა</Text>
            <Pressable onPress={() => refetch()} className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
              <Text className="text-brand text-sm font-semibold">ხელახლა ცდა</Text>
            </Pressable>
          </View>
        ) : (
          <View className="py-10 items-center px-8">
            <Text className="text-sm text-zinc-500 dark:text-zinc-400 text-center">ჯერ არავინ.</Text>
          </View>
        )
      }
    />
  );
}
