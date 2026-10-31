import { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityIndicator, FlatList, Image, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { PostStatsBadge } from '@/components/ui/PostStatsBadge';
import { questsApi } from '@/lib/quests';
import { useLayout } from '@/lib/layout';
import type { MobilePostType } from '@/types/post';

/** Same grid as the profile's posts tab: 3 columns upright, 6 once the window is wide. */
const COLUMNS = 3;
const WIDE_COLUMNS = 6;
const WIDE_MIN_WIDTH = 560;
/** Matches web's POSTS_PER_PAGE_GRID (a whole number of rows). */
const PAGE_SIZE = 18;
const GAP = 2;

export default function QuestCompletionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { availableWidth } = useLayout();
  const { slug, questId: questIdParam } = useLocalSearchParams<{ slug: string; questId: string }>();
  const questId = Number(questIdParam);

  const query = useInfiniteQuery({
    queryKey: ['quest-completions', slug, questId] as const,
    queryFn: ({ pageParam }) =>
      questsApi.getQuestCompletions(slug, questId, {
        limit: PAGE_SIZE,
        cursorDate: pageParam?.cursorDate,
        cursorId: pageParam?.cursorId,
      }),
    initialPageParam: undefined as undefined | { cursorDate: string; cursorId: number },
    getNextPageParam: (lastPage) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      const last = lastPage[lastPage.length - 1];
      return { cursorDate: last.date, cursorId: Number(last.id) };
    },
    enabled: !!slug && Number.isInteger(questId),
  });

  const columns = availableWidth >= WIDE_MIN_WIDTH ? WIDE_COLUMNS : COLUMNS;
  const rows = useMemo(() => {
    const posts = query.data?.pages.flat() ?? [];
    const r: MobilePostType[][] = [];
    for (let i = 0; i < posts.length; i += columns) r.push(posts.slice(i, i + columns));
    return r;
  }, [query.data, columns]);
  // Percent, not pixels, so the cells tile whatever width the list has (see ProfileView).
  const cellStyle = { width: `${100 / columns}%`, aspectRatio: 1, padding: GAP / 2 } as const;

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
        <Text className="text-zinc-500 dark:text-zinc-400 text-sm text-center mb-4">ჩატვირთვა ვერ მოხერხდა</Text>
        <Pressable onPress={() => query.refetch()} className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
          <Text className="text-brand text-sm font-semibold">ხელახლა ცდა</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      className="flex-1 bg-zinc-50 dark:bg-zinc-950"
      data={rows}
      keyExtractor={(row) => String(row[0].id)}
      contentContainerStyle={{ paddingTop: GAP, paddingBottom: 16 + insets.bottom }}
      initialNumToRender={6}
      windowSize={7}
      removeClippedSubviews
      onEndReachedThreshold={0.5}
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
      }}
      renderItem={({ item: row }) => (
        <View style={{ flexDirection: 'row', paddingHorizontal: GAP / 2 }}>
          {row.map((post) => {
            const cover = post.photos?.[0];
            const coverUri = cover?.variants?.thumb ?? cover?.url;
            return (
              <View key={post.id} style={cellStyle}>
                <Pressable
                  onPress={() => router.push({ pathname: '/(app)/post/[id]', params: { id: String(post.id) } })}
                  style={{ flex: 1 }}
                >
                  {coverUri ? (
                    <Image source={{ uri: coverUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  ) : (
                    <View style={{ width: '100%', height: '100%' }} className="items-center justify-center bg-amber-500">
                      <Feather name="flag" size={22} color="#fff" />
                    </View>
                  )}
                  <View className="absolute top-1.5 left-1.5">
                    <Feather name="flag" size={16} color="#FBBF24" />
                  </View>
                  {/* Every tile is the same quest, so the caption is who completed it. */}
                  <View className="absolute bottom-0 inset-x-0 px-1.5 pt-3 pb-1" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
                    <Text className="text-[10px] font-medium text-white" numberOfLines={1}>&apos;{post.author}</Text>
                  </View>
                  <PostStatsBadge
                    className="absolute top-1.5 right-1.5"
                    size="sm"
                    voteScore={post.voteScore ?? 0}
                    guessCount={null}
                    commentCount={post.commentCount ?? 0}
                    rewards={post.rewards}
                  />
                </Pressable>
              </View>
            );
          })}
          {row.length < columns
            ? Array.from({ length: columns - row.length }).map((_, i) => (
                <View key={`e-${i}`} style={cellStyle} />
              ))
            : null}
        </View>
      )}
      ListEmptyComponent={
        <View className="py-16 items-center">
          <Text className="text-sm text-zinc-500 dark:text-zinc-400">პოსტები არ არის</Text>
        </View>
      }
      ListFooterComponent={
        query.isFetchingNextPage ? (
          <View className="py-4"><ActivityIndicator color="#14B8A6" /></View>
        ) : null
      }
    />
  );
}
