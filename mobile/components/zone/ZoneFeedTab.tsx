import { useMemo, useState, type ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/constants/colors';
import { FeedPostCard } from '@/components/feed/FeedPostCard';
import { HideAndSeekCard } from '@/components/hideandseek/HideAndSeekCard';
import { zonesApi, type MobileZoneFeedFilter, type ZoneTag } from '@/lib/zones';
import { FEED_STATUS_FILTERS, FeedOptionsSheet } from '@/components/zone/FeedOptionsSheet';

const PAGE_SIZE = 4;

function FeedOptionsBar({
  filter,
  activeTagId,
  tags,
  onOpen,
}: {
  filter: MobileZoneFeedFilter;
  activeTagId: number | null;
  tags: ZoneTag[];
  onOpen: () => void;
}) {
  const theme = useTheme();
  const statusLabel = FEED_STATUS_FILTERS.find((o) => o.value === filter)?.label ?? '';
  const activeTag = tags.find((t) => t.id === activeTagId) ?? null;
  const activeCount = (filter === 'all' ? 0 : 1) + (activeTag ? 1 : 0);

  return (
    <View className="flex-row items-center gap-2 px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
      <Pressable
        onPress={onOpen}
        className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
      >
        <Feather name="sliders" size={14} color={theme.icon} />
        <Text className="text-xs font-medium text-zinc-700 dark:text-zinc-300">მართვა</Text>
        {activeCount > 0 ? (
          <View className="ml-0.5 h-4 min-w-4 px-1 rounded-full bg-teal-600 items-center justify-center">
            <Text className="text-[10px] font-bold text-white">{activeCount}</Text>
          </View>
        ) : null}
      </Pressable>

      {filter !== 'all' ? (
        <Text className="text-xs text-zinc-500 dark:text-zinc-400" numberOfLines={1}>{statusLabel}</Text>
      ) : null}
      {activeTag ? (
        <View className="px-2 py-0.5 rounded-full" style={{ borderWidth: 1.5, borderColor: activeTag.color }}>
          <Text className="text-[11px] font-semibold" style={{ color: activeTag.color }}>{activeTag.name}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function ZoneFeedTab({ slug, header }: { slug: string; header?: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<MobileZoneFeedFilter>('all');
  const [activeTagId, setActiveTagId] = useState<number | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);

  const feedQuery = useInfiniteQuery({
    queryKey: ['zone-feed', slug, filter, activeTagId] as const,
    queryFn: async ({ pageParam }) =>
      zonesApi.loadZoneFeed(slug, {
        limit: PAGE_SIZE,
        filter,
        tagId: activeTagId ?? undefined,
        cursorDate: pageParam?.cursorDate,
        cursorId: pageParam?.cursorId,
      }),
    initialPageParam: undefined as undefined | { cursorDate: string; cursorId: number },
    getNextPageParam: (lastPage) => {
      if (lastPage.posts.length < PAGE_SIZE) return undefined;
      const last = lastPage.posts[lastPage.posts.length - 1];
      return { cursorDate: last.date, cursorId: Number(last.id) };
    },
  });

  const zoneTags = feedQuery.data?.pages[0]?.tags ?? [];
  const posts = useMemo(() => feedQuery.data?.pages.flatMap((p) => p.posts) ?? [], [feedQuery.data]);

  const optionsBar = (
    <FeedOptionsBar
      filter={filter}
      activeTagId={activeTagId}
      tags={zoneTags}
      onOpen={() => setOptionsOpen(true)}
    />
  );

  return (
    <View className="flex-1 bg-zinc-50 dark:bg-zinc-950">
      <FeedOptionsSheet
        visible={optionsOpen}
        onClose={() => setOptionsOpen(false)}
        filter={filter}
        onFilterChange={(v) => {
          setFilter(v);
          setActiveTagId(null);
        }}
        tags={zoneTags}
        activeTagId={activeTagId}
        onTagChange={setActiveTagId}
      />

      {feedQuery.isLoading ? (
        <>
          {header}
          {optionsBar}
          <View className="flex-1 items-center justify-center"><ActivityIndicator size="large" color="#14B8A6" /></View>
        </>
      ) : feedQuery.isError ? (
        <>
          {header}
          {optionsBar}
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-sm text-zinc-500 dark:text-zinc-400 text-center mb-4">ჩატვირთვა ვერ მოხერხდა</Text>
            <Pressable onPress={() => feedQuery.refetch()} className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
              <Text className="text-brand text-sm font-semibold">ხელახლა ცდა</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) =>
            item.type === 'hide-and-seek' ? <HideAndSeekCard item={item} /> : <FeedPostCard item={item} showZone={false} />
          }
          ListHeaderComponent={
            <>
              {header}
              {optionsBar}
            </>
          }
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (feedQuery.hasNextPage && !feedQuery.isFetchingNextPage) feedQuery.fetchNextPage();
          }}
          ListEmptyComponent={
            <View className="py-16 items-center">
              <Text className="text-sm text-zinc-500 dark:text-zinc-400">პოსტები არ არის</Text>
            </View>
          }
          ListFooterComponent={
            feedQuery.isFetchingNextPage ? (
              <View className="py-4"><ActivityIndicator color="#14B8A6" /></View>
            ) : posts.length > 0 && !feedQuery.hasNextPage ? (
              <View className="py-4 items-center">
                <Text className="text-xs text-zinc-500 dark:text-zinc-400">მეტი პოსტი არ არის</Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}
