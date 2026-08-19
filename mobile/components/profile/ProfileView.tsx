import { useMemo, useState, type ReactElement } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { PostStatsBadge } from '@/components/ui/PostStatsBadge';
import { getLevelColor } from '@/components/ui/LevelBadge';
import { StreakBadge } from '@/components/ui/StreakBadge';
import { FollowButton } from '@/components/profile/FollowButton';
import { GuessesTab } from '@/components/profile/GuessesTab';
import { AchievementsTab } from '@/components/profile/AchievementsTab';
import { ConnectionsTab } from '@/components/profile/ConnectionsTab';
import { usersApi, type XPInfo } from '@/lib/users';
import { processProfilePhoto } from '@/lib/image';
import { formatAge } from '@/lib/dates';
import type { MobilePostType } from '@/types/post';

const MAX_LEVEL = 42;
/** Only used if the API response predates `xpInfo`. */
const FALLBACK_XP_PER_LEVEL = 100;
const COLUMNS = 3;
const GAP = 2;
const CELL_SIZE = (Dimensions.get('window').width - GAP * (COLUMNS + 1)) / COLUMNS;
const PROFILE_PHOTO_MAX = 5 * 1024 * 1024;

type Tab = 'posts' | 'guesses' | 'achievements' | 'connections';

const TABS: { id: Tab; label: string }[] = [
  { id: 'posts', label: 'პოსტები' },
  { id: 'guesses', label: 'გამოცნობები' },
  { id: 'achievements', label: 'მიღწევები' },
  { id: 'connections', label: 'კავშირები' },
];

/** Mirrors web QuestCompletionTitle. */
function questCompletionTitle(questTitle: string | null | undefined): string {
  return questTitle ? `შეასრულა მისია ${questTitle}` : 'შეასრულა მისია';
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
        <Text numberOfLines={1} className="text-xs font-semibold" style={{ color: getLevelColor(info.level) }}>
          დონე {info.level}
          {isMaxLevel ? ' (მაქს)' : ''}
        </Text>
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
function PostsTab({ posts, header }: { posts: MobilePostType[]; header: ReactElement }) {
  const router = useRouter();
  const rows = useMemo(() => {
    const r: MobilePostType[][] = [];
    for (let i = 0; i < posts.length; i += COLUMNS) r.push(posts.slice(i, i + COLUMNS));
    return r;
  }, [posts]);

  return (
    <FlatList
      className="flex-1 bg-zinc-50 dark:bg-zinc-950"
      data={rows}
      keyExtractor={(row) => String(row[0].id)}
      ListHeaderComponent={header}
      contentContainerStyle={{ paddingBottom: 40 }}
      initialNumToRender={6}
      windowSize={7}
      removeClippedSubviews
      renderItem={({ item: row }) => (
        <View style={{ flexDirection: 'row', paddingHorizontal: GAP / 2 }}>
          {row.map((post) => {
            const isQuest = post.type === 'quest-completion';
            const cover = isQuest ? post.photos?.[0] : null;
            const coverUri = isQuest
              ? (cover?.variants?.thumb ?? cover?.url)
              : (post.imageVariants?.thumb ?? post.image);
            return (
              <Pressable
                key={post.id}
                onPress={() => router.push({ pathname: '/(app)/post/[id]', params: { id: String(post.id) } })}
                style={{ width: CELL_SIZE, height: CELL_SIZE, margin: GAP / 2 }}
              >
                {coverUri ? (
                  <Image source={{ uri: coverUri }} style={{ width: CELL_SIZE, height: CELL_SIZE }} resizeMode="cover" />
                ) : (
                  <View style={{ width: CELL_SIZE, height: CELL_SIZE }} className="items-center justify-center bg-amber-500">
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
                {/* Vote / guess / comment counts, as on the web profile grid. */}
                <PostStatsBadge
                  className="absolute top-1.5 right-1.5"
                  size="sm"
                  voteScore={post.voteScore ?? 0}
                  guessCount={isQuest ? null : (post.guessCount ?? 0)}
                  commentCount={post.commentCount ?? 0}
                />
              </Pressable>
            );
          })}
          {row.length < COLUMNS
            ? Array.from({ length: COLUMNS - row.length }).map((_, i) => (
                <View key={`e-${i}`} style={{ width: CELL_SIZE, height: CELL_SIZE, margin: GAP / 2 }} />
              ))
            : null}
        </View>
      )}
      ListEmptyComponent={
        <View className="py-10 items-center">
          <Text className="text-sm text-zinc-500 dark:text-zinc-400">პოსტები არ არის</Text>
        </View>
      }
    />
  );
}

export function ProfileView({ alias, isOwn }: { alias: string; isOwn: boolean }) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('posts');
  const [uploading, setUploading] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['user-profile', alias],
    queryFn: () => usersApi.getProfile(alias),
    enabled: !!alias,
  });

  async function changeAvatar() {
    if (!isOwn || uploading) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
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

  const { user, profilePhoto, level, posts, streak } = data;
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
      <View className="mx-4 mt-4 bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-100 dark:border-zinc-800">
        <View className="flex-row gap-4 items-center">
          <Pressable onPress={changeAvatar} disabled={!isOwn} className="relative">
            <ProfileAvatar name={user.alias} photoUrl={profilePhoto?.url ?? null} size={80} shape="md" />
            {isOwn ? (
              <View className="absolute bottom-1 right-1 h-6 w-6 rounded-full bg-teal-600 items-center justify-center border-2 border-white dark:border-zinc-900">
                {uploading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Feather name="camera" size={12} color="#ffffff" />
                )}
              </View>
            ) : null}
          </Pressable>
          <View className="flex-1" style={{ minWidth: 0 }}>
            <Text numberOfLines={1} className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              &apos;{user.alias}
            </Text>
            {user.age != null ? (
              <Text className="text-xs text-zinc-400 mt-1">ასაკი: {formatAge(user.age)}</Text>
            ) : null}
            <Text className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{posts.length} პოსტი</Text>
          </View>
          {!isOwn ? (
            <View style={{ flexShrink: 0 }}>
              <FollowButton alias={alias} initialFollowing={data.isFollowing} size="sm" />
            </View>
          ) : null}
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

  // Heavy, unbounded, image-bearing tabs are virtualized via their own FlatList
  // (header rides along as ListHeaderComponent) so rows are windowed and recycled.
  if (tab === 'posts') return <PostsTab posts={posts} header={header} />;
  if (tab === 'connections') return <ConnectionsTab alias={alias} isOwn={isOwn} header={header} />;

  // Guesses (capped) and achievements (compacted) are small; a plain ScrollView
  // stays smooth and keeps their internal sort/group UI untouched.
  return (
    <ScrollView className="flex-1 bg-zinc-50 dark:bg-zinc-950" contentContainerStyle={{ paddingBottom: 40 }}>
      {header}
      {tab === 'guesses' ? <GuessesTab alias={alias} /> : null}
      {tab === 'achievements' ? <AchievementsTab alias={alias} /> : null}
    </ScrollView>
  );
}
