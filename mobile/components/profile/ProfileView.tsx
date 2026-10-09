import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  Text,
  View,
  type RefreshControlProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { PostStatsBadge } from '@/components/ui/PostStatsBadge';
import { getLevelColor } from '@/components/ui/LevelBadge';
import { InfoButton } from '@/components/ui/InfoButton';
import { StreakBadge } from '@/components/ui/StreakBadge';
import { FollowButton } from '@/components/profile/FollowButton';
import { ShareButton } from '@/components/ui/ShareButton';
import { ReportSheet } from '@/components/ReportSheet';
import { GuessesTab } from '@/components/profile/GuessesTab';
import { AchievementsTab } from '@/components/profile/AchievementsTab';
import { ConnectionsTab } from '@/components/profile/ConnectionsTab';
import { usersApi, type XPInfo } from '@/lib/users';
import { processProfilePhoto } from '@/lib/image';
import { requestLibraryAccess } from '@/lib/photoAccess';
import { useLayout } from '@/lib/layout';
import { formatAge } from '@/lib/dates';
import type { MobilePostType } from '@/types/post';

const MAX_LEVEL = 60;
/** Only used if the API response predates `xpInfo`. */
const FALLBACK_XP_PER_LEVEL = 100;
/**
 * Grid columns: 3 upright, 6 once the window is wide enough (landscape). Both
 * divide the page size evenly, so a full page is always whole rows.
 */
const COLUMNS = 3;
const WIDE_COLUMNS = 6;
const WIDE_MIN_WIDTH = 560;
/** Grid page size, matching web's POSTS_PER_PAGE_GRID (a whole number of rows). */
const POSTS_PAGE_SIZE = 18;
const GAP = 2;
const PROFILE_PHOTO_MAX = 5 * 1024 * 1024;
/** Scroll offset past which the alias in the header card is (mostly) off screen. */
const SCROLLED_OFFSET = 50;

type Tab = 'posts' | 'guesses' | 'achievements' | 'connections';

const TABS: { id: Tab; label: string }[] = [
  { id: 'posts', label: 'პოსტები' },
  { id: 'guesses', label: 'გამოცნობები' },
  { id: 'achievements', label: 'მიღწევები' },
  { id: 'connections', label: 'კავშირები' },
];

/** Mirrors web QuestCompletionTitle. */
function questCompletionTitle(questTitle: string | null | undefined): string {
  return questTitle ? `შეასრულა მისია "${questTitle}"` : 'შეასრულა მისია';
}

/** Thousands separator, standing in for web's `toLocaleString`. */
function formatXp(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Mirrors web `components/xp-bar`: tier-coloured level label on the left,
 * "progress / needed გმ" on the right, amber progress bar underneath.
 */
function XPBar({ info }: { info: XPInfo }) {
  const isMaxLevel = info.level >= MAX_LEVEL;
  const progress = info.xpForNextLevel > 0 ? info.currentXP / info.xpForNextLevel : 1;

  return (
    <View className="w-full">
      <View className="flex-row justify-between items-center gap-2 mb-2">
        <View className="flex-row items-center gap-1.5" style={{ flexShrink: 1, minWidth: 0 }}>
          <Text numberOfLines={1} className="text-xs font-semibold" style={{ color: getLevelColor(info.level) }}>
            დონე {info.level}
            {isMaxLevel ? ' (მაქს)' : ''}
          </Text>
          <InfoButton topic="level" size={13} />
        </View>
        <Text numberOfLines={1} className="text-xs text-zinc-500 dark:text-zinc-400">
          {isMaxLevel
            ? `${formatXp(info.totalXP)} გმ`
            : `${formatXp(info.currentXP)} / ${formatXp(info.xpForNextLevel)} გმ`}
        </Text>
      </View>
      <View className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
        <View
          className="h-full rounded-full bg-amber-500"
          style={{ width: `${Math.min(progress * 100, 100)}%` }}
        />
      </View>
    </View>
  );
}

/**
 * Virtualized post grid: chunks posts into rows of {@link COLUMNS} and renders
 * them through a FlatList so only the visible window of image rows is mounted.
 * The profile header + tab bar ride along as the list header so they scroll with
 * the grid, exactly as in the previous single-ScrollView layout.
 */
function PostsTab({
  posts,
  header,
  refreshControl,
  onScroll,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  onEndReached,
}: {
  posts: MobilePostType[];
  header: ReactElement;
  refreshControl: ReactElement<RefreshControlProps>;
  onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  isLoading: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onEndReached: () => void;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { availableWidth, gutter } = useLayout();
  const columns = availableWidth >= WIDE_MIN_WIDTH ? WIDE_COLUMNS : COLUMNS;
  const rows = useMemo(() => {
    const r: MobilePostType[][] = [];
    for (let i = 0; i < posts.length; i += columns) r.push(posts.slice(i, i + columns));
    return r;
  }, [posts, columns]);
  // Percent, not pixels: under the side tab rail the grid is narrower than the
  // window, and a percent cell tiles whatever width it is given. The row's and the
  // cell's GAP / 2 padding keep the same gaps between cells and at the edges.
  const cellStyle = { width: `${100 / columns}%`, aspectRatio: 1, padding: GAP / 2 } as const;

  return (
    <FlatList
      className="flex-1 bg-zinc-50 dark:bg-zinc-950"
      data={rows}
      keyExtractor={(row) => String(row[0].id)}
      ListHeaderComponent={<View style={{ paddingHorizontal: gutter }}>{header}</View>}
      refreshControl={refreshControl}
      onScroll={onScroll}
      scrollEventThrottle={32}
      contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
      initialNumToRender={6}
      windowSize={7}
      removeClippedSubviews
      onEndReachedThreshold={0.5}
      onEndReached={onEndReached}
      renderItem={({ item: row }) => (
        <View style={{ flexDirection: 'row', paddingHorizontal: GAP / 2 }}>
          {row.map((post) => {
            const isQuest = post.type === 'quest-completion';
            const cover = isQuest ? post.photos?.[0] : null;
            const coverUri = isQuest
              ? (cover?.variants?.thumb ?? cover?.url)
              : (post.imageVariants?.thumb ?? post.image);
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
                  {isQuest ? (
                    <>
                      <View className="absolute top-1.5 left-1.5">
                        <Feather name="flag" size={16} color="#FBBF24" />
                      </View>
                      {post.questTitle ? (
                        <View
                          className="absolute bottom-0 inset-x-0 px-1.5 pt-3 pb-1"
                          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
                        >
                          <Text className="text-[10px] font-medium text-white" numberOfLines={1}>
                            {questCompletionTitle(post.questTitle)}
                          </Text>
                        </View>
                      ) : null}
                    </>
                  ) : null}
                  {/* Vote / guess / comment / reward counts, as on the web profile grid. */}
                  <PostStatsBadge
                    className="absolute top-1.5 right-1.5"
                    size="sm"
                    voteScore={post.voteScore ?? 0}
                    guessCount={isQuest ? null : (post.guessCount ?? 0)}
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
        isLoading ? (
          <View className="py-10 items-center"><ActivityIndicator color="#14B8A6" /></View>
        ) : (
          <View className="py-10 items-center">
            <Text className="text-sm text-zinc-500 dark:text-zinc-400">პოსტები არ არის</Text>
          </View>
        )
      }
      ListFooterComponent={
        isFetchingNextPage ? (
          <View className="py-4"><ActivityIndicator color="#14B8A6" /></View>
        ) : posts.length > 0 && !hasNextPage ? (
          <View className="py-4 items-center">
            <Text className="text-xs text-zinc-500 dark:text-zinc-400">მეტი პოსტი არ არის</Text>
          </View>
        ) : null
      }
    />
  );
}

export function ProfileView({
  alias,
  isOwn,
  onScrolledChange,
}: {
  alias: string;
  isOwn: boolean;
  /** Fires when the identity row (alias) scrolls out of view, and back. */
  onScrolledChange?: (scrolled: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const scrolledRef = useRef(false);
  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!onScrolledChange) return;
      const scrolled = e.nativeEvent.contentOffset.y > SCROLLED_OFFSET;
      if (scrolled === scrolledRef.current) return;
      scrolledRef.current = scrolled;
      onScrolledChange(scrolled);
    },
    [onScrolledChange],
  );
  const insets = useSafeAreaInsets();
  const { gutter } = useLayout();
  const [tab, setTab] = useState<Tab>('posts');
  // Switching tabs remounts the list at offset 0, so the title swap must reset too.
  useEffect(() => {
    if (!scrolledRef.current) return;
    scrolledRef.current = false;
    onScrolledChange?.(false);
  }, [tab, onScrolledChange]);
  const [uploading, setUploading] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['user-profile', alias],
    queryFn: () => usersApi.getProfile(alias),
    enabled: !!alias,
  });

  // The grid is paged separately from the profile header so it can keep loading
  // past the first page as the user scrolls. Kept outside the loading branches
  // below so it runs in parallel with the profile request.
  const postsQuery = useInfiniteQuery({
    queryKey: ['account-posts', alias],
    queryFn: ({ pageParam }) =>
      usersApi.getPosts(alias, {
        limit: POSTS_PAGE_SIZE,
        cursorDate: pageParam?.cursorDate,
        cursorId: pageParam?.cursorId,
      }),
    initialPageParam: undefined as undefined | { cursorDate: string; cursorId: number },
    getNextPageParam: (lastPage) => {
      if (lastPage.length < POSTS_PAGE_SIZE) return undefined;
      const last = lastPage[lastPage.length - 1];
      return { cursorDate: last.date, cursorId: Number(last.id) };
    },
    enabled: !!alias,
  });

  const loadedPosts = useMemo(() => postsQuery.data?.pages.flat() ?? [], [postsQuery.data]);
  const loadMorePosts = useCallback(() => {
    if (postsQuery.hasNextPage && !postsQuery.isFetchingNextPage) postsQuery.fetchNextPage();
  }, [postsQuery]);

  // Pull-to-refresh. The profile query only backs the header, so the grid pages
  // and the mounted tab's own query are refetched alongside it. The spinner is
  // driven manually so it covers the whole round trip.
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetch(),
        queryClient.refetchQueries({ queryKey: ['account-posts', alias], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['guesses', alias], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['achievements', alias], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['connections', alias], type: 'active' }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [refetch, queryClient, alias]);

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={handleRefresh}
      colors={['#14B8A6']}
      tintColor="#14B8A6"
    />
  );

  async function changeAvatar() {
    if (!isOwn || uploading) return;
    if (!(await requestLibraryAccess({ withLocation: false }))) {
      Alert.alert('წვდომა საჭიროა', 'გალერეაზე წვდომა საჭიროა სურათის ასარჩევად.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset.uri) return;
    const size = asset.fileSize ?? 0;
    if (size > PROFILE_PHOTO_MAX) {
      Alert.alert('ფაილი დიდია', 'სურათი არ უნდა აღემატებოდეს 5 მეგაბაიტს.');
      return;
    }

    setUploading(true);
    try {
      // Normalize the square-cropped avatar to a 512×512 JPEG before upload (matches web).
      const processed = await processProfilePhoto(asset.uri, asset.fileName ?? undefined);
      await usersApi.uploadProfilePhoto(processed.uri, processed.size || 1, processed.type);
      await queryClient.invalidateQueries({ queryKey: ['user-profile', alias] });
      await queryClient.invalidateQueries({ queryKey: ['account', 'me'] });
    } catch {
      Alert.alert('შეცდომა', 'სურათის ატვირთვა ვერ მოხერხდა.');
    } finally {
      setUploading(false);
    }
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <ActivityIndicator size="large" color="#14B8A6" />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View className="flex-1 items-center justify-center px-8 bg-zinc-50 dark:bg-zinc-950">
        <Text className="text-zinc-500 dark:text-zinc-400 text-sm text-center mb-4">პროფილის ჩატვირთვა ვერ მოხერხდა</Text>
        <Pressable onPress={() => refetch()} className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
          <Text className="text-brand text-sm font-semibold">ხელახლა ცდა</Text>
        </Pressable>
      </View>
    );
  }

  const { user, profilePhoto, level, streak } = data;
  // Server-side total, so the header does not grow as more pages load. Older
  // responses carry the first page inline instead.
  const postsCount = data.postsCount ?? Math.max(loadedPosts.length, data.posts?.length ?? 0);
  // The API computes level/progress from the xp table (as web does); fall back to
  // the raw user_xp row if the response predates `xpInfo`.
  const xpInfo: XPInfo = data.xpInfo ?? {
    level: level?.level ?? 1,
    currentXP: (level?.xp ?? 0) % FALLBACK_XP_PER_LEVEL,
    xpForNextLevel: FALLBACK_XP_PER_LEVEL,
    totalXP: level?.xp ?? 0,
    levelStartXP: 0,
    levelEndXP: FALLBACK_XP_PER_LEVEL,
  };

  // Header card + tab bar, shared by both the virtualized (posts/connections)
  // and the lightweight ScrollView (guesses/achievements) layouts below.
  const header = (
    <>
      {/* Header card — same three blocks as the web account layout: identity row,
          XP + streak row, then the tab bar. The XP row spans the full card width
          so the follow button can never squeeze it (as it did on other profiles). */}
      <View className="mx-4 mt-4 p-4">
        <View className="flex-row gap-4 items-center">
          <Pressable onPress={changeAvatar} disabled={!isOwn} className="relative">
            <ProfileAvatar name={user.alias} photoUrl={profilePhoto?.url ?? null} size={80} shape="md" />
            {isOwn ? (
              <View className="absolute bottom-1 right-1 h-6 w-6 rounded-full bg-teal-600 items-center justify-center border-2 border-zinc-50 dark:border-zinc-950">
                {uploading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Feather name="camera" size={12} color="#ffffff" />
                )}
              </View>
            ) : null}
          </Pressable>
          <View className="flex-1" style={{ minWidth: 0 }}>
            {/* Alias gets the whole column width; the follow/report/share buttons sit
                on the row below so they can never truncate it. */}
            <Text numberOfLines={1} className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              &apos;{user.alias}
            </Text>
            <View className="flex-row items-center gap-2 mt-1">
              <View className="flex-1" style={{ minWidth: 0 }}>
                {user.age != null ? (
                  <Text className="text-xs text-zinc-500 dark:text-zinc-400">ასაკი: {formatAge(user.age)}</Text>
                ) : null}
                <Text className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{postsCount} პოსტი</Text>
              </View>
              <View style={{ flexShrink: 0 }} className="flex-row items-center gap-2">
                {!isOwn ? (
                  <>
                    <FollowButton alias={alias} initialFollowing={data.isFollowing} size="sm" />
                    <Pressable
                      onPress={() => setShowReport(true)}
                      hitSlop={8}
                      className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 items-center justify-center"
                    >
                      <Feather name="flag" size={14} color="#71717a" />
                    </Pressable>
                  </>
                ) : null}
                <ShareButton
                  path={`/account/${encodeURIComponent(user.alias)}`}
                  title={`'${user.alias}`}
                  size={14}
                  color="#71717a"
                  className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 items-center justify-center"
                />
              </View>
            </View>
          </View>
        </View>

        {/* XP bar + streak flame, mirroring the web account header row. */}
        <View className="mt-4 flex-row items-center gap-3">
          <View className="flex-1" style={{ minWidth: 0 }}>
            <XPBar info={xpInfo} />
          </View>
          {streak ? <StreakBadge streak={streak} /> : null}
        </View>
      </View>

      {/* Underlined tab bar, mirroring web AccountTabs (wraps instead of scrolling). */}
      <View className="flex-row flex-wrap px-4 pt-3 pb-1">
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <Pressable key={t.id} onPress={() => setTab(t.id)} className="px-2 pt-2 pb-1 items-center">
              <Text
                className={`text-sm font-medium ${
                  active ? 'text-zinc-900 dark:text-zinc-50' : 'text-zinc-500 dark:text-zinc-400'
                }`}
              >
                {t.label}
              </Text>
              <View className={`mt-1 h-0.5 w-full rounded ${active ? 'bg-teal-600' : 'bg-transparent'}`} />
            </Pressable>
          );
        })}
      </View>
    </>
  );

  const reportSheet = showReport ? (
    <ReportSheet targetType="user" targetId={user.id} onClose={() => setShowReport(false)} />
  ) : null;

  // Heavy, unbounded, image-bearing tabs are virtualized via their own FlatList
  // (header rides along as ListHeaderComponent) so rows are windowed and recycled.
  if (tab === 'posts')
    return (
      <>
        <PostsTab
          posts={loadedPosts}
          header={header}
          refreshControl={refreshControl}
          onScroll={handleScroll}
          isLoading={postsQuery.isLoading}
          hasNextPage={postsQuery.hasNextPage}
          isFetchingNextPage={postsQuery.isFetchingNextPage}
          onEndReached={loadMorePosts}
        />
        {reportSheet}
      </>
    );
  if (tab === 'connections')
    return (
      <>
        <ConnectionsTab alias={alias} isOwn={isOwn} header={header} refreshControl={refreshControl} onScroll={handleScroll} />
        {reportSheet}
      </>
    );

  // Guesses (two five-row lists plus the index panel) and achievements
  // (compacted) are small; a plain ScrollView stays smooth here.
  return (
    <>
      <ScrollView
        className="flex-1 bg-zinc-50 dark:bg-zinc-950"
        contentContainerStyle={{ paddingBottom: 40 + insets.bottom, paddingHorizontal: gutter }}
        refreshControl={refreshControl}
        onScroll={handleScroll}
        scrollEventThrottle={32}
      >
        {header}
        {tab === 'guesses' ? <GuessesTab alias={alias} /> : null}
        {tab === 'achievements' ? <AchievementsTab alias={alias} /> : null}
      </ScrollView>
      {reportSheet}
    </>
  );
}
