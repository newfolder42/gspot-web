import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, Text, View } from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRouter } from 'expo-router';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { LevelBadge } from '@/components/ui/LevelBadge';
import { TagBadge } from '@/components/ui/TagBadge';
import { feedApi, type MobileFeedFilter } from '@/lib/feed';
import { AppDrawer } from '@/components/ui/AppDrawer';
import type { MobilePostType } from '@/types/post';

const PAGE_SIZE = 4;

function formatTimeAgo(timestamp: string): string {
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

function FeedFilterChips({
  value,
  onChange,
}: {
  value: MobileFeedFilter;
  onChange: (next: MobileFeedFilter) => void;
}) {
  const options: Array<{ value: MobileFeedFilter; label: string }> = [
    { value: 'all', label: 'ყველა' },
    { value: 'guessed', label: 'გამოცნობილი' },
    { value: 'not-guessed', label: 'გამოსაცნობი' },
  ];

  return (
    <View className="px-4 pt-3 pb-2 flex-row gap-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            className={`px-3 py-1.5 rounded-full border ${
              active
                ? 'bg-teal-600 border-teal-600'
                : 'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700'
            }`}
          >
            <Text className={`text-xs font-medium ${active ? 'text-white' : 'text-zinc-700 dark:text-zinc-300'}`}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function FeedPostCard({ item }: { item: MobilePostType }) {
  const router = useRouter();

  return (
    <View className="mb-4">
      {/* ── Metadata header – mirrors web <article> p-2 block ── */}
      <View className="p-2">
        <View className="flex-row items-center gap-1.5 flex-wrap">
          {/* Zone avatar + slug – tappable → zone feed */}
          <Pressable
            className="flex-row items-center gap-1.5"
            onPress={() => router.push({ pathname: '/(app)/zone/[slug]', params: { slug: item.zoneSlug ?? '' } })}
          >
            <ProfileAvatar name={item.zoneSlug ?? ''} photoUrl={item.zoneProfilePhoto} size={24} shape="md" />
            <Text className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{item.zoneSlug}</Text>
          </Pressable>
          <Text className="text-xs text-zinc-400">•</Text>
          {/* Author + level badge – tappable → user profile */}
          <Pressable
            className="flex-row items-center gap-1"
            onPress={() => router.push({ pathname: '/(app)/user/[alias]', params: { alias: item.author } })}
          >
            <Text className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">&apos;{item.author}</Text>
            {item.authorLevel != null ? <LevelBadge level={item.authorLevel} /> : null}
          </Pressable>
          <Text className="text-xs text-zinc-400">•</Text>
          <Text className="text-xs text-zinc-400">{formatTimeAgo(item.date)}</Text>
          {/* Failed dot */}
          {item.status === 'failed' ? (
            <View className="w-3 h-3 rounded-full bg-rose-600" />
          ) : null}
        </View>

        {/* Tag – solid colour, white text */}
        {item.tag ? <TagBadge name={item.tag.name} color={item.tag.color} /> : null}

        {/* Title */}
        {item.title ? (
          <Text className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{item.title}</Text>
        ) : null}
      </View>

      {/* ── Image block ── */}
      <Pressable
        onPress={() => router.push({ pathname: '/(app)/post/[id]', params: { id: String(item.id) } })}
        className="relative"
      >
        <Image
          source={{ uri: item.image }}
          className="w-full h-80 bg-black"
          resizeMode="contain"
        />
        {/* Counter badge – matches web: bg-zinc-900/80 backdrop-blur border border-zinc-100/20 */}
        <View
          className="absolute top-3 right-3 flex-row items-center gap-1.5 rounded-full px-2.5 py-1 border border-white/20"
          style={{ backgroundColor: 'rgba(24,24,27,0.8)' }}
        >
          <Feather name="map-pin" size={16} color="#FAFAFA" />
          <Text className="text-sm font-semibold text-zinc-50">{item.guessCount ?? 0}</Text>
          <View className="flex-row items-center gap-1 ml-2">
            <Feather name="message-circle" size={16} color="#FAFAFA" />
            <Text className="text-sm font-semibold text-zinc-50">{item.commentCount ?? 0}</Text>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

export default function HomeScreen() {
  const [filter, setFilter] = useState<MobileFeedFilter>('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable onPress={() => setDrawerOpen(true)} style={{ marginLeft: 14 }}>
          <Feather name="menu" size={22} color="#A1A1AA" />
        </Pressable>
      ),
    });
  }, [navigation]);

  const queryKey = useMemo(() => ['global-feed', filter] as const, [filter]);

  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) =>
      feedApi.loadGlobal({
        limit: PAGE_SIZE,
        filter,
        cursorDate: pageParam?.cursorDate,
        cursorId: pageParam?.cursorId,
      }),
    initialPageParam: undefined as undefined | { cursorDate: string; cursorId: number },
    getNextPageParam: (lastPage) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      const lastPost = lastPage[lastPage.length - 1];
      return {
        cursorDate: lastPost.date,
        cursorId: Number(lastPost.id),
      };
    },
  });

  const posts = useMemo(() => query.data?.pages.flat() ?? [], [query.data]);

  return (
    <ScreenLayout>
      <View className="flex-1 bg-zinc-50 dark:bg-zinc-950">
        <FeedFilterChips value={filter} onChange={setFilter} />

        {query.isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#14B8A6" />
          </View>
        ) : query.isError ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-sm text-zinc-500 dark:text-zinc-400 text-center mb-4">
              ფიდის ჩატვირთვა ვერ მოხერხდა
            </Text>
            <Pressable onPress={() => query.refetch()} className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
              <Text className="text-brand text-sm font-semibold">ხელახლა ცდა</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
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
                <Text className="text-sm text-zinc-500 dark:text-zinc-400">პოსტები არ არის</Text>
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
        )}
      </View>
      <AppDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onOpen={() => setDrawerOpen(true)} />
    </ScreenLayout>
  );
}
