import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  Text,
  View,
  type ViewToken,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useInfiniteQuery } from '@tanstack/react-query';
import { NewGuess } from '@/components/NewGuess';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { LevelBadge } from '@/components/ui/LevelBadge';
import { SHUFFLE_DECK_SIZE, SHUFFLE_EXCLUDE_LIMIT, shuffleApi } from '@/lib/shuffle';
import { shareLink } from '@/lib/share';
import { Colors } from '@/constants/colors';
import type { MobilePostType } from '@/types/post';

/** Deal the next deck once this few cards are left, so it lands before it's needed. */
const REFILL_AT = 3;

/** Below this, scrolling on is a flick past the card rather than a considered skip. */
const SKIP_AFTER_MS = 2000;

/** A card counts as the active one once this much of it is on screen. */
const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 60 };

/** White icons sit straight on the photo, so a soft shadow keeps them legible on bright shots. */
const RAIL_ICON_SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.6)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 4,
} as const;

function RailButton({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="h-12 w-12 items-center justify-center active:opacity-70"
    >
      <Feather name={icon} size={30} color="#fff" style={RAIL_ICON_SHADOW} />
    </Pressable>
  );
}

type CardProps = {
  item: MobilePostType;
  index: number;
  height: number;
  onGuess: (post: MobilePostType) => void;
};

/**
 * Memoised so the active-card bookkeeping re-renders the screen without
 * repainting every photo in the window mid-scroll.
 */
const ShuffleCard = memo(function ShuffleCard({ item, index, height, onGuess }: CardProps) {
  const router = useRouter();

  return (
    <View style={{ height }} className="bg-black">
      {/* The photo itself is a guess button — the whole card is the target. */}
      <Pressable className="flex-1" onPress={() => onGuess(item)}>
        <Image
          source={{ uri: item.imageVariants?.feed ?? item.image }}
          className="w-full h-full"
          resizeMode="contain"
          // Android fades a photo in over 300ms by default, which reads as the card arriving slowly.
          fadeDuration={0}
        />
      </Pressable>

      {/* Who and where, over the top of the photo; empty areas pass taps through to the guess. */}
      <View
        pointerEvents="box-none"
        className="absolute inset-x-0 top-0 px-3 pt-3 pb-6"
        style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      >
        <View pointerEvents="box-none" className="flex-row items-center gap-1.5">
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

      {/* Reels-style action rail. Skipping is the scroll itself, so there is no button for it. */}
      <View pointerEvents="box-none" className="absolute right-3 items-center gap-4" style={{ bottom: 28 }}>
        <RailButton icon="map-pin" label="გამოცნობა" onPress={() => onGuess(item)} />
        <RailButton
          icon="message-circle"
          label="კომენტარები"
          onPress={() =>
            router.push({ pathname: '/(app)/post/[id]', params: { id: String(item.id) } })
          }
        />
        <RailButton icon="share-2" label="გაზიარება" onPress={() => shareLink({ path: `/post/${item.id}` })} />
      </View>
    </View>
  );
});

/**
 * Shuffle guess, played like reels: one full-screen photo per page, scroll on to
 * skip it, or guess it on the map with the same modal the post page uses.
 */
export function GuessShuffle() {
  const router = useRouter();
  const listRef = useRef<FlatList<MobilePostType>>(null);

  const [cardHeight, setCardHeight] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [guessPost, setGuessPost] = useState<MobilePostType | null>(null);

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

  // A tab stays mounted when the player leaves it: hand the skips over then, and
  // restart the card's clock on return so time away doesn't count as time spent looking.
  useFocusEffect(
    useCallback(() => {
      shownAt.current = Date.now();
      return () => { flushSkips(); };
    }, [flushSkips]),
  );

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

  const renderCard = useCallback(
    ({ item, index }: { item: MobilePostType; index: number }) => (
      <ShuffleCard item={item} index={index} height={cardHeight} onGuess={setGuessPost} />
    ),
    [cardHeight],
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
          <Pressable onPress={() => router.navigate('/(app)/(tabs)')} className="px-4 py-2 rounded-lg bg-zinc-800">
            <Text className="text-brand text-sm font-semibold">მთავარზე დაბრუნება</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={posts}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderCard}
          getItemLayout={(_, index) => ({ length: cardHeight, offset: cardHeight * index, index })}
          // Reels feel: any flick settles on the adjacent card (momentum can't carry
          // past it), and the fast rate makes the settle snappy instead of drifting.
          snapToInterval={cardHeight}
          snapToAlignment="start"
          decelerationRate="fast"
          disableIntervalMomentum
          showsVerticalScrollIndicator={false}
          windowSize={3}
          initialNumToRender={2}
          maxToRenderPerBatch={2}
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

      {guessPost ? (
        <NewGuess
          post={guessPost}
          onSubmitted={() => guessedIds.current.add(Number(guessPost.id))}
          onClose={() => {
            setGuessPost(null);
            if (guessedIds.current.has(Number(guessPost.id))) goToNext();
          }}
        />
      ) : null}
    </View>
  );
}
