import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  FlatList,
  Image,
  Pressable,
  Text,
  View,
  type LayoutChangeEvent,
  type ViewToken,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useInfiniteQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { NewGuess } from '@/components/NewGuess';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { LevelBadge } from '@/components/ui/LevelBadge';
import { PinchZoomImage } from '@/components/ui/ZoomableImage';
import { SHUFFLE_DECK_SIZE, SHUFFLE_EXCLUDE_LIMIT, shuffleApi } from '@/lib/shuffle';
import { shareLink } from '@/lib/share';
import { Colors } from '@/constants/colors';
import type { MobilePostType } from '@/types/post';

const SHUFFLE_QUERY_KEY = ['guess-shuffle'];

/** Deal the next deck once this few cards are left, so it lands before it's needed. */
const REFILL_AT = 3;

/**
 * Coming back after this long, the cards still ahead of the one on screen are
 * swapped for a fresh deal — they may have been guessed, hidden or deleted
 * meanwhile (on the web, say) — while the card being looked at stays put.
 */
const REFRESH_AFTER_AWAY_MS = 2 * 60 * 1000;

/** Away this long, nothing of the old deck is worth keeping: start over from card 1. */
const RELOAD_AFTER_AWAY_MS = 2 * 60 * 60 * 1000;

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
  // The card runs edge to edge, so in landscape the overlays clear the notch /
  // navigation bar at the right themselves (the tab rail already covers the left).
  const { right: insetRight } = useSafeAreaInsets();
  // The card shows the 1280px feed rendition; the master is only worth fetching
  // once the player actually pinches in.
  const [sharp, setSharp] = useState(false);
  const feedUri = item.imageVariants?.feed ?? item.image;

  return (
    <View style={{ height }} className="bg-black">
      {/* The photo itself is a guess button — the whole card is the target. Pinching it zooms instead. */}
      <Pressable className="flex-1" onPress={() => onGuess(item)}>
        <PinchZoomImage
          uri={sharp ? item.image : feedUri}
          placeholderUri={sharp ? feedUri : null}
          style={{ flex: 1 }}
          resizeMode="contain"
          embedded
          onZoom={() => setSharp(true)}
        />
      </Pressable>

      {/* Who and where, over the top of the photo; empty areas pass taps through to the guess. */}
      <View
        pointerEvents="box-none"
        className="absolute inset-x-0 top-0 px-3 pt-3 pb-6"
        style={{ backgroundColor: 'rgba(0,0,0,0.45)', paddingRight: 12 + insetRight }}
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
      <View pointerEvents="box-none" className="absolute right-3 items-center gap-4" style={{ bottom: 28, right: 12 + insetRight }}>
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
  const queryClient = useQueryClient();
  const listRef = useRef<FlatList<MobilePostType>>(null);

  const [cardHeight, setCardHeight] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [guessPost, setGuessPost] = useState<MobilePostType | null>(null);

  const cardHeightRef = useRef(0);
  // Rotating re-measures every card under a scroll offset that is still counted in
  // the old height. While `holdViewability` is set the list is being put back on
  // the active card, and its own "what is on screen now" reports (which see the
  // stale offset) are not read as the player scrolling on and skipping cards.
  const holdViewability = useRef(false);
  const releaseHold = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeIndexRef = useRef(0);
  const postsRef = useRef<MobilePostType[]>([]);
  const shownAt = useRef(0);
  const guessedIds = useRef(new Set<number>());
  const pendingSkips = useRef<number[]>([]);
  const dealtIds = useRef<number[]>([]);
  // Whether the screen is the tab in front, and since when the player stopped
  // looking at it (leaving the tab, or the app going to the background).
  const focused = useRef(false);
  const awayFrom = useRef<number | null>(null);
  // The server's last deal came back short. Tracked apart from the page contents
  // because a refresh may drop duplicates from a full deal.
  const poolUsedUp = useRef(false);

  const flushSkips = useCallback(async () => {
    if (pendingSkips.current.length === 0) return;
    const ids = pendingSkips.current;
    pendingSkips.current = [];
    await shuffleApi.skip(ids);
  }, []);

  const query = useInfiniteQuery({
    queryKey: SHUFFLE_QUERY_KEY,
    queryFn: async () => {
      // Sent first so the new deck already knows about them.
      await flushSkips();
      const posts = await shuffleApi.loadDeck(dealtIds.current.slice(-SHUFFLE_EXCLUDE_LIMIT));
      dealtIds.current = [...dealtIds.current, ...posts.map((p) => Number(p.id))];
      poolUsedUp.current = posts.length < SHUFFLE_DECK_SIZE;
      return posts;
    },
    initialPageParam: 0,
    // The server excludes what it already dealt, so the page param carries
    // nothing; a short deck means the pool is used up.
    getNextPageParam: (_lastPage, allPages) => (poolUsedUp.current ? undefined : allPages.length),
    // The deck is a session, not a cache: a refetch replays every page with the
    // dealt ids excluded, which comes back empty and wipes the deck. Only
    // `reload` below starts a new one.
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const posts = useMemo(() => query.data?.pages.flat() ?? [], [query.data]);

  const deckIsEmpty = query.isSuccess && posts.length === 0;
  const deckIsEmptyRef = useRef(false);
  useEffect(() => { deckIsEmptyRef.current = deckIsEmpty; }, [deckIsEmpty]);

  /** Throws the deck away and deals a fresh one from scratch. */
  const reload = useCallback(() => {
    pendingSkips.current = [];
    dealtIds.current = [];
    poolUsedUp.current = false;
    activeIndexRef.current = 0;
    postsRef.current = [];
    setActiveIndex(0);
    queryClient.resetQueries({ queryKey: SHUFFLE_QUERY_KEY });
  }, [queryClient]);

  /**
   * Swaps the cards after the one on screen for a fresh deal, silently. The old
   * ones may have been guessed or hidden since they were dealt, and the server
   * only drops those when it deals. The deck is left alone if the deal fails or
   * races another fetch.
   */
  const refreshAhead = useCallback(async () => {
    const deckKey = { queryKey: SHUFFLE_QUERY_KEY };
    const before = queryClient.getQueryData<InfiniteData<MobilePostType[]>>(SHUFFLE_QUERY_KEY);
    if (!before) {
      // Nothing to refresh: the first deal failed, so try it again.
      if (queryClient.isFetching(deckKey) === 0) reload();
      return;
    }
    if (queryClient.isFetching(deckKey) > 0) return;

    const dealt = before.pages.flat();
    const aheadIds = new Set(dealt.slice(activeIndexRef.current + 1).map((p) => Number(p.id)));
    if (aheadIds.size === 0 && poolUsedUp.current) return;

    try {
      const fresh = await shuffleApi.loadDeck(
        dealtIds.current.filter((id) => !aheadIds.has(id)).slice(-SHUFFLE_EXCLUDE_LIMIT),
      );

      // The player may have scrolled on, or a refill started, while the deal was in flight.
      if (queryClient.isFetching(deckKey) > 0) return;
      const now = queryClient.getQueryData<InfiniteData<MobilePostType[]>>(SHUFFLE_QUERY_KEY);
      if (!now) return;
      const kept = now.pages.flat().slice(0, activeIndexRef.current + 1);
      const keptIds = new Set(kept.map((p) => Number(p.id)));
      const added = fresh.filter((p) => !keptIds.has(Number(p.id)));

      dealtIds.current = [
        ...dealtIds.current.filter((id) => keptIds.has(id) || !aheadIds.has(id)),
        ...added.map((p) => Number(p.id)),
      ];
      poolUsedUp.current = fresh.length < SHUFFLE_DECK_SIZE;
      queryClient.setQueryData<InfiniteData<MobilePostType[]>>(SHUFFLE_QUERY_KEY, {
        pages: [kept, added],
        pageParams: [0, 1],
      });
    } catch {
      // Keep playing the deck we have.
    }
  }, [queryClient, reload]);

  /**
   * The player is looking at the screen again. Short absences change nothing; a
   * longer one refreshes the cards ahead, and a very long one starts a new deck.
   * An empty deck gets another try regardless, since new posts may have arrived.
   */
  const onReturn = useCallback(() => {
    const away = awayFrom.current == null ? 0 : Date.now() - awayFrom.current;
    awayFrom.current = null;
    shownAt.current = Date.now();

    if (deckIsEmptyRef.current || away >= RELOAD_AFTER_AWAY_MS) reload();
    else if (away >= REFRESH_AFTER_AWAY_MS) refreshAhead();
  }, [reload, refreshAhead]);

  // The viewability callback keeps one identity for the list's whole life, so
  // it reads the current deck through a ref rather than a closure.
  useEffect(() => { postsRef.current = posts; }, [posts]);

  // A tab stays mounted when the player leaves it: hand the skips over then, and
  // on return restart the card's clock (time away isn't time spent looking) and
  // see whether the deck has gone stale.
  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      onReturn();
      return () => {
        focused.current = false;
        awayFrom.current ??= Date.now();
        flushSkips();
      };
    }, [flushSkips, onReturn]),
  );

  // Leaving the tab is caught above; leaving the app is not. An unfocused tab
  // is handled when it regains focus, from the time it was left.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (!focused.current) return;
      if (state === 'active') {
        onReturn();
      } else {
        awayFrom.current ??= Date.now();
        flushSkips();
      }
    });
    return () => sub.remove();
  }, [flushSkips, onReturn]);

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

  /**
   * Puts the active card back under the viewport. Runs when the content resizes
   * after a rotation (and once more as a fallback), and lets viewability reports
   * through again a beat after the last jump.
   */
  const realign = useCallback(() => {
    if (!holdViewability.current) return;
    listRef.current?.scrollToOffset({ offset: activeIndexRef.current * cardHeightRef.current, animated: false });
    if (releaseHold.current) clearTimeout(releaseHold.current);
    releaseHold.current = setTimeout(() => { holdViewability.current = false; }, 300);
  }, []);

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const next = e.nativeEvent.layout.height;
    if (cardHeightRef.current !== 0 && next !== cardHeightRef.current) {
      holdViewability.current = true;
      // Normally the content-size change does the realigning; this covers a
      // rotation that somehow leaves the content the same size.
      setTimeout(realign, 400);
    }
    cardHeightRef.current = next;
    setCardHeight(next);
  }, [realign]);

  // FlatList refuses a changing onViewableItemsChanged, so this identity is fixed.
  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (holdViewability.current) return;
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
    <View className="flex-1 bg-black" onLayout={handleLayout}>
      {query.isLoading || cardHeight === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={Colors.brand} />
        </View>
      ) : query.isError ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-sm text-zinc-400 text-center mb-4">დეკის ჩატვირთვა ვერ მოხერხდა</Text>
          <Pressable onPress={reload} className="px-4 py-2 rounded-lg bg-zinc-800">
            <Text className="text-brand text-sm font-semibold">ხელახლა ცდა</Text>
          </Pressable>
        </View>
      ) : posts.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-sm text-zinc-400 text-center mb-4">ახალი გამოსაცნობი ჯერჯერობით არ არის</Text>
          <Pressable onPress={reload} className="px-4 py-2 rounded-lg bg-zinc-800">
            <Text className="text-brand text-sm font-semibold">განახლება</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={posts}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderCard}
          getItemLayout={(_, index) => ({ length: cardHeight, offset: cardHeight * index, index })}
          // After a rotation the cards change height; this puts the active one back in view.
          onContentSizeChange={realign}
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
          // Guessed elsewhere meanwhile: same as having just guessed it, so close moves on.
          onAlreadyGuessed={() => guessedIds.current.add(Number(guessPost.id))}
          onClose={() => {
            setGuessPost(null);
            if (guessedIds.current.has(Number(guessPost.id))) goToNext();
          }}
        />
      ) : null}
    </View>
  );
}
