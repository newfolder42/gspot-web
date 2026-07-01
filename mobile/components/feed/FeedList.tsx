import { useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { FeedPostCard } from '@/components/feed/FeedPostCard';
import type { MobilePostType } from '@/types/post';

const PAGE_SIZE = 4;

type FeedCursor = { cursorDate: string; cursorId: number };

type FeedLoader = (params: {
  limit: number;
  cursorDate?: string;
  cursorId?: number;
}) => Promise<MobilePostType[]>;

/**
 * Paginated, pull-to-refresh feed list shared by the global and to-guess feeds.
 * Pass a stable `queryKey` and the matching `feedApi` loader.
 */
export function FeedList({
  queryKey,
  loader,
  emptyText = 'პოსტები არ არის',
}: {
  queryKey: readonly unknown[];
  loader: FeedLoader;
  emptyText?: string;
}) {
  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) =>
      loader({
        limit: PAGE_SIZE,
        cursorDate: pageParam?.cursorDate,
        cursorId: pageParam?.cursorId,
      }),
    initialPageParam: undefined as undefined | FeedCursor,
    getNextPageParam: (lastPage) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      const lastPost = lastPage[lastPage.length - 1];
      return { cursorDate: lastPost.date, cursorId: Number(lastPost.id) };
    },
  });

  const posts = useMemo(() => query.data?.pages.flat() ?? [], [query.data]);

  if (query.isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#14B8A6" />
      </View>
    );
  }

  if (query.isError) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-sm text-zinc-500 dark:text-zinc-400 text-center mb-4">
          ფიდის ჩატვირთვა ვერ მოხერხდა
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
      data={posts}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => <FeedPostCard item={item} />}
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
          <Text className="text-sm text-zinc-500 dark:text-zinc-400">{emptyText}</Text>
        </View>
      }
      ListFooterComponent={
        query.isFetchingNextPage ? (
          <View className="py-4">
            <ActivityIndicator color="#14B8A6" />
          </View>
        ) : posts.length > 0 && !query.hasNextPage ? (
          <View className="py-4 items-center">
            <Text className="text-xs text-zinc-400">მეტი პოსტი არ არის</Text>
          </View>
        ) : null
      }
    />
  );
}
