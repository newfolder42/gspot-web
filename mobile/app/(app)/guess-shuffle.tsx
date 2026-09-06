import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  Text,
  View,
  type ViewToken,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useInfiniteQuery } from '@tanstack/react-query';
import { NewGuess } from '@/components/NewGuess';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { LevelBadge } from '@/components/ui/LevelBadge';
import { SHUFFLE_DECK_SIZE, SHUFFLE_EXCLUDE_LIMIT, shuffleApi } from '@/lib/shuffle';
import { Colors } from '@/constants/colors';
import type { MobilePostType } from '@/types/post';

/** Deal the next deck once this few cards are left, so it lands before it's needed. */
const REFILL_AT = 3;

/** Below this, scrolling on is a flick past the card rather than a considered skip. */
const SKIP_AFTER_MS = 2000;

/** A card counts as the active one once this much of it is on screen. */
const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 60 };

/**
 * Shuffle guess, played like reels: one full-screen photo per page, scroll on to
 * skip it, or guess it on the map with the same modal the post page uses.
 */
export default function GuessShuffleScreen() {
  const router = useRouter();
  // The cards run to the bottom edge, so the action bar clears the system bar itself.
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<MobilePostType>>(null);

  const [cardHeight, setCardHeight] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showGuess, setShowGuess] = useState(false);

  const activeIndexRef = useRef(0);
  const postsRef = useRef<MobilePostType[]>([]);
  const shownAt = useRef(0);
  const guessedIds = useRef(new Set<number>());
  const pendingSkips = useRef<number[]>([]);
  const dealtIds = useRef<number[]>([]);

  const flushSkips = useCallback(async () => {
    if (pendingSkips.current.length === 0) return;
    const ids = pendingSkips.current;
    pendingSkips.current = [];
    await shuffleApi.skip(ids);
  }, []);

  const query = useInfiniteQuery({
    queryKey: ['guess-shuffle'],
    queryFn: async () => {
      // Sent first so the new deck already knows about them.
      await flushSkips();
      const posts = await shuffleApi.loadDeck(dealtIds.current.slice(-SHUFFLE_EXCLUDE_LIMIT));
      dealtIds.current = [...dealtIds.current, ...posts.map((p) => Number(p.id))];
      return posts;
    },
    initialPageParam: 0,
    // The server excludes what it already dealt, so the page param carries
    // nothing; a short deck means the pool is used up.
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < SHUFFLE_DECK_SIZE ? undefined : allPages.length,
  });

  const posts = useMemo(() => query.data?.pages.flat() ?? [], [query.data]);

  // The viewability callback keeps one identity for the list's whole life, so
  // it reads the current deck through a ref rather than a closure.
  useEffect(() => { postsRef.current = posts; }, [posts]);
  useEffect(() => { shownAt.current = Date.now(); }, []);

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;

  useEffect(() => {
    if (posts.length - activeIndex <= REFILL_AT && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [posts.length, activeIndex, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Keep the next couple of photos warm so scrolling on feels instant.
  useEffect(() => {
    for (const post of posts.slice(activeIndex + 1, activeIndex + 3)) {
      Image.prefetch(post.imageVariants?.feed ?? post.image);
    }
  }, [posts, activeIndex]);

  useEffect(() => () => { flushSkips(); }, [flushSkips]);

  // FlatList refuses a changing onViewableItemsChanged, so this identity is fixed.
  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems[0];
    if (!first || first.index == null || first.index === activeIndexRef.current) return;

    const left = postsRef.current[activeIndexRef.current];
    if (
      left &&
      !guessedIds.current.has(Number(left.id)) &&
      Date.now() - shownAt.current >= SKIP_AFTER_MS
    ) {
      pendingSkips.current.push(Number(left.id));
    }

    activeIndexRef.current = first.index;
    shownAt.current = Date.now();
    setActiveIndex(first.index);
  }, []);

  const goToNext = useCallback(() => {
    if (activeIndexRef.current + 1 >= postsRef.current.length) return;
    listRef.current?.scrollToIndex({ index: activeIndexRef.current + 1, animated: true });
  }, []);

  const activePost = posts[activeIndex] ?? null;

  const renderCard = ({ item, index }: { item: MobilePostType; index: number }) => (
    <View style={{ height: cardHeight }} className="bg-black">
      <Image
        source={{ uri: item.imageVariants?.feed ?? item.image }}
        className="w-full h-full"
        resizeMode="contain"
      />

      {/* Who and where, over the top of the photo */}
      <View
        className="absolute inset-x-0 top-0 px-3 pt-3 pb-6"
        style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      >
        <View className="flex-row items-center gap-1.5">
          <Pressable
            className="flex-row items-center gap-1.5"
            onPress={() =>
              router.push({ pathname: '/(app)/zone/[slug]', params: { slug: item.zoneSlug ?? '' } })
            }
          >
            <ProfileAvatar name={item.zoneSlug ?? ''} photoUrl={item.zoneProfilePhoto} size={24} shape="md" />
            <Text className="text-sm font-semibold text-zinc-100">{item.zoneSlug}</Text>
          </Pressable>
          <Text className="text-xs text-zinc-400">•</Text>
          <Pressable
            className="flex-row items-center gap-1"
            onPress={() =>
              router.push({ pathname: '/(app)/user/[alias]', params: { alias: item.author } })
            }
          >
            <Text className="text-sm font-semibold text-zinc-100">&apos;{item.author}</Text>
            {item.authorLevel != null ? <LevelBadge level={item.authorLevel} /> : null}
          </Pressable>
          <Text className="ml-auto text-xs text-zinc-300">{index + 1}</Text>
        </View>
        {item.title ? <Text className="mt-1 text-sm text-zinc-200">{item.title}</Text> : null}
      </View>

      {/* Skip / guess. Scrolling on does the same as გამოტოვება. */}
      <View
        className="absolute inset-x-0 bottom-0 flex-row items-center gap-2 px-3 pt-6"
        style={{ backgroundColor: 'rgba(0,0,0,0.45)', paddingBottom: insets.bottom + 20 }}
      >
        <Pressable
          onPress={goToNext}
          className="flex-row items-center gap-1.5 rounded-xl px-4 h-11 justify-center active:opacity-80"
          style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
        >
          <Feather name="chevron-down" size={16} color="#fff" />
          <Text className="text-sm font-semibold text-white">გამოტოვება</Text>
        </Pressable>
        <Pressable
          onPress={() => setShowGuess(true)}
          className="ml-auto flex-row items-center gap-1.5 rounded-xl bg-teal-600 px-5 h-11 justify-center active:opacity-80"
        >
          <Feather name="map-pin" size={16} color="#fff" />
          <Text className="text-sm font-semibold text-white">გამოცნობა</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-black" onLayout={(e) => setCardHeight(e.nativeEvent.layout.height)}>
      {query.isLoading || cardHeight === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={Colors.brand} />
        </View>
      ) : query.isError ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-sm text-zinc-400 text-center mb-4">დეკის ჩატვირთვა ვერ მოხერხდა</Text>
          <Pressable onPress={() => query.refetch()} className="px-4 py-2 rounded-lg bg-zinc-800">
            <Text className="text-brand text-sm font-semibold">ხელახლა ცდა</Text>
          </Pressable>
        </View>
      ) : posts.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-sm text-zinc-400 text-center mb-4">ახალი გამოსაცნობი ჯერჯერობით არ არის</Text>
          <Pressable onPress={() => router.back()} className="px-4 py-2 rounded-lg bg-zinc-800">
            <Text className="text-brand text-sm font-semibold">დაბრუნება</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={posts}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderCard}
          getItemLayout={(_, index) => ({ length: cardHeight, offset: cardHeight * index, index })}
          pagingEnabled
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={VIEWABILITY_CONFIG}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={{ height: cardHeight }} className="items-center justify-center">
                <ActivityIndicator color={Colors.brand} />
              </View>
            ) : !hasNextPage ? (
              <View style={{ height: cardHeight }} className="items-center justify-center px-8">
                <Text className="text-sm text-zinc-400 text-center">სულ ესაა ამჯერად</Text>
              </View>
            ) : null
          }
        />
      )}

      {showGuess && activePost ? (
        <NewGuess
          post={activePost}
          onSubmitted={() => guessedIds.current.add(Number(activePost.id))}
          onClose={() => {
            setShowGuess(false);
            if (guessedIds.current.has(Number(activePost.id))) goToNext();
          }}
        />
      ) : null}
    </View>
  );
}
