import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ProgressiveImage } from '@/components/ui/ProgressiveImage';
import { POST_BOOKMARKS_KEY, POST_BOOKMARKS_PAGE_SIZE, bookmarksApi, useBookmarkToggle } from '@/lib/bookmarks';
import { useLayout } from '@/lib/layout';
import { Colors, useTheme } from '@/constants/colors';
import type { PostBookmarkType } from '@/types/bookmark';

/** What names the row: the post's title, or what kind of post it is when it has none. */
function rowTitle(row: PostBookmarkType): string {
  if (row.type === 'quest-completion') {
    return row.questTitle ? `შეასრულა მისია "${row.questTitle}"` : 'შეასრულა მისია';
  }
  if (row.title) return row.title;
  return row.type === 'hide-and-seek' ? 'დამალობანა' : 'პოსტი';
}

const PLACEHOLDER_ICON: Record<PostBookmarkType['type'], keyof typeof Feather.glyphMap> = {
  'gps-photo': 'image',
  text: 'file-text',
  'quest-completion': 'flag',
  'hide-and-seek': 'eye',
};

/**
 * One saved post, kept deliberately small: a thumbnail to recognise it by, its title and where
 * it came from. Tapping opens the post; the ✕ takes it off the list.
 */
const BookmarkRow = memo(function BookmarkRow({
  row,
  onOpen,
  onRemove,
}: {
  row: PostBookmarkType;
  onOpen: (row: PostBookmarkType) => void;
  onRemove: (row: PostBookmarkType) => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={() => onOpen(row)}
      className="flex-row items-center gap-3 py-2.5 border-b border-zinc-200 dark:border-zinc-800 active:opacity-70"
    >
      <View className="w-14 h-14 rounded-lg overflow-hidden items-center justify-center bg-zinc-100 dark:bg-zinc-800">
        {row.thumbnail ? (
          <ProgressiveImage uri={row.thumbnail} className="w-full h-full" resizeMode="cover" />
        ) : (
          <Feather name={PLACEHOLDER_ICON[row.type]} size={22} color={theme.iconFaint} />
        )}
      </View>

      <View className="flex-1">
        <Text numberOfLines={2} className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          {rowTitle(row)}
        </Text>
        <Text numberOfLines={1} className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          {row.zoneSlug} • &apos;{row.author}
        </Text>
        {row.userHasGuessed ? (
          <View className="mt-1 flex-row items-center gap-1">
            <Feather name="check-circle" size={12} color={Colors.brand} />
            <Text className="text-xs font-semibold text-teal-600 dark:text-teal-400">გამოცნობილია</Text>
          </View>
        ) : null}
      </View>

      <Pressable
        onPress={() => onRemove(row)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="დავიწყება"
        className="p-2"
      >
        <Feather name="x" size={18} color={theme.icon} />
      </Pressable>
    </Pressable>
  );
});

/**
 * ჩამახსოვრებულები: the posts the user saved, newest first, as a plain list. Meant for the
 * moment they are standing near one and want to open it quickly, so there is no post content
 * here beyond what identifies it, and nothing about where it is: a distance would give the
 * answer to a post that is still waiting to be guessed.
 */
export function BookmarksList() {
  const router = useRouter();
  const { gutter } = useLayout();
  const remove = useBookmarkToggle();

  const query = useInfiniteQuery({
    queryKey: POST_BOOKMARKS_KEY,
    queryFn: ({ pageParam }) => bookmarksApi.listPosts({ cursorId: pageParam }),
    initialPageParam: undefined as number | undefined,
    // A full page means there may be more; the server filters before it limits, so a short
    // page is the true end.
    getNextPageParam: (lastPage) =>
      lastPage.length < POST_BOOKMARKS_PAGE_SIZE ? undefined : lastPage[lastPage.length - 1].id,
  });

  const rows = useMemo(() => query.data?.pages.flat() ?? [], [query.data]);

  // Coming back to the list (from a post, say, where it may since have been guessed) refetches
  // it; the first focus is the initial load, which is already under way.
  const { refetch } = query;
  const seenFocus = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (seenFocus.current) refetch();
      else seenFocus.current = true;
    }, [refetch])
  );

  // Driven by hand so the spinner stays up for the whole refetch.
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const handleOpen = useCallback(
    (row: PostBookmarkType) =>
      router.push({ pathname: '/(app)/post/[id]', params: { id: String(row.postId) } }),
    [router]
  );
  const { mutate } = remove;
  const handleRemove = useCallback(
    (row: PostBookmarkType) => mutate({ postId: Number(row.postId), save: false }),
    [mutate]
  );

  if (query.isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={Colors.brand} />
      </View>
    );
  }

  if (query.isError) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-sm text-zinc-500 dark:text-zinc-400 text-center mb-4">ჩატვირთვა ვერ მოხერხდა</Text>
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
      // Centres the list in a column when the window is wider than a phone held upright.
      contentContainerStyle={{ paddingHorizontal: gutter }}
      keyExtractor={(row) => String(row.id)}
      renderItem={({ item }) => <BookmarkRow row={item} onOpen={handleOpen} onRemove={handleRemove} />}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[Colors.brand]}
          tintColor={Colors.brand}
        />
      }
      onEndReachedThreshold={0.5}
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
      }}
      ListEmptyComponent={
        <View className="py-16 px-6 items-center">
          <Text className="text-sm text-zinc-500 dark:text-zinc-400 text-center">
            ჩამახსოვრებული პოსტები არ გაქვს
          </Text>
          <Text className="mt-1 text-xs text-zinc-400 dark:text-zinc-500 text-center">
            პოსტის ⋯ მენიუდან შეგიძლია ჩაიმახსოვრო
          </Text>
        </View>
      }
      ListFooterComponent={
        query.isFetchingNextPage ? (
          <View className="py-4">
            <ActivityIndicator color={Colors.brand} />
          </View>
        ) : null
      }
    />
  );
}
