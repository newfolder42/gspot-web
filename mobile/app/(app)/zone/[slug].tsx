import { useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityIndicator, FlatList, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { LevelBadge } from '@/components/ui/LevelBadge';
import { TagBadge } from '@/components/ui/TagBadge';
import { zonesApi, type MobileZoneFeedFilter, type ZoneTag } from '@/lib/zones';
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

const STATUS_FILTERS: Array<{ value: MobileZoneFeedFilter; label: string }> = [
  { value: 'all', label: 'ყველა' },
  { value: 'guessed', label: 'გამოცნობილი' },
  { value: 'not-guessed', label: 'გამოსაცნობი' },
];

function FilterBar({
  filter,
  onFilterChange,
  tags,
  activeTagId,
  onTagChange,
}: {
  filter: MobileZoneFeedFilter;
  onFilterChange: (v: MobileZoneFeedFilter) => void;
  tags: ZoneTag[];
  activeTagId: number | null;
  onTagChange: (id: number | null) => void;
}) {
  return (
    <View className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        {STATUS_FILTERS.map((opt) => {
          const active = opt.value === filter;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onFilterChange(opt.value)}
              className={`px-3 py-1.5 rounded-full border ${active ? 'bg-teal-600 border-teal-600' : 'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700'}`}
            >
              <Text className={`text-xs font-medium ${active ? 'text-white' : 'text-zinc-700 dark:text-zinc-300'}`}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {tags.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 8 }}>
          <Pressable
            onPress={() => onTagChange(null)}
            className={`px-3 py-1 rounded-full border ${activeTagId === null ? 'bg-zinc-700 border-zinc-700' : 'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700'}`}
          >
            <Text className={`text-xs font-medium ${activeTagId === null ? 'text-white' : 'text-zinc-600 dark:text-zinc-300'}`}>ყველა</Text>
          </Pressable>
          {tags.map((tag) => {
            const active = activeTagId === tag.id;
            return (
              <Pressable key={tag.id} onPress={() => onTagChange(active ? null : tag.id)}>
                <View
                  className="px-3 py-1 rounded-full"
                  style={{
                    backgroundColor: active ? tag.color : 'transparent',
                    borderWidth: 1.5,
                    borderColor: tag.color,
                  }}
                >
                  <Text className="text-xs font-semibold" style={{ color: active ? '#fff' : tag.color }}>
                    {tag.name}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}

function PostCard({ item }: { item: MobilePostType }) {
  const router = useRouter();
  return (
    <View className="mb-4">
      <View className="p-2">
        <View className="flex-row items-center gap-1.5 flex-wrap">
          <Pressable
            className="flex-row items-center gap-1"
            onPress={() => router.push({ pathname: '/(app)/user/[alias]', params: { alias: item.author } })}
          >
            <Text className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">&apos;{item.author}</Text>
            {item.authorLevel != null ? <LevelBadge level={item.authorLevel} /> : null}
          </Pressable>
          <Text className="text-xs text-zinc-400">•</Text>
          <Text className="text-xs text-zinc-400">{formatTimeAgo(item.date)}</Text>
          {item.status === 'failed' ? <View className="w-3 h-3 rounded-full bg-rose-600" /> : null}
        </View>
        {item.tag ? <TagBadge name={item.tag.name} color={item.tag.color} /> : null}
        {item.title ? <Text className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{item.title}</Text> : null}
      </View>
      <Pressable
        onPress={() => router.push({ pathname: '/(app)/post/[id]', params: { id: String(item.id) } })}
        className="relative"
      >
        <Image source={{ uri: item.image }} className="w-full h-80 bg-black" resizeMode="contain" />
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

export default function ZoneFeedScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<MobileZoneFeedFilter>('all');
  const [activeTagId, setActiveTagId] = useState<number | null>(null);

  const queryKey = useMemo(
    () => ['zone-feed', slug, filter, activeTagId] as const,
    [slug, filter, activeTagId]
  );

  const feedQuery = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam }) => {
      const res = await zonesApi.loadZoneFeed(slug, {
        limit: PAGE_SIZE,
        filter,
        tagId: activeTagId ?? undefined,
        cursorDate: pageParam?.cursorDate,
        cursorId: pageParam?.cursorId,
      });
      if (!pageParam) {
        navigation.setOptions({ title: res.zone.slug });
      }
      return res;
    },
    initialPageParam: undefined as undefined | { cursorDate: string; cursorId: number },
    getNextPageParam: (lastPage) => {
      if (lastPage.posts.length < PAGE_SIZE) return undefined;
      const last = lastPage.posts[lastPage.posts.length - 1];
      return { cursorDate: last.date, cursorId: Number(last.id) };
    },
  });

  const zoneInfo = feedQuery.data?.pages[0]?.zone ?? null;
  const zoneTags = feedQuery.data?.pages[0]?.tags ?? [];
  const posts = useMemo(() => feedQuery.data?.pages.flatMap((p) => p.posts) ?? [], [feedQuery.data]);

  return (
    <View className="flex-1 bg-zinc-50 dark:bg-zinc-950">
      {/* Zone header */}
      {zoneInfo ? (
        <View className="px-4 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex-row items-center gap-3">
          <ProfileAvatar name={zoneInfo.slug} photoUrl={zoneInfo.profilePhotoUrl} size={40} shape="md" />
          <View className="flex-1">
            <Text className="text-base font-bold text-zinc-900 dark:text-zinc-50">{zoneInfo.slug}</Text>
            {zoneInfo.description ? (
              <Text className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5" numberOfLines={2}>{zoneInfo.description}</Text>
            ) : null}
          </View>
        </View>
      ) : null}

      <FilterBar
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
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#14B8A6" />
        </View>
      ) : feedQuery.isError ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-sm text-zinc-500 dark:text-zinc-400 text-center mb-4">ჩატვირთვა ვერ მოხერხდა</Text>
          <Pressable onPress={() => feedQuery.refetch()} className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
            <Text className="text-brand text-sm font-semibold">ხელახლა ცდა</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <PostCard item={item} />}
          contentContainerStyle={{ paddingBottom: insets.bottom }}
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
                <Text className="text-xs text-zinc-400">მეტი პოსტი არ არის</Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}
