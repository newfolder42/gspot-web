import { ActivityIndicator, Dimensions, FlatList, Image, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { LevelBadge } from '@/components/ui/LevelBadge';
import { usersApi } from '@/lib/users';
import type { MobilePostType } from '@/types/post';

const XP_PER_LEVEL = 100;
const COLUMNS = 3;
const GAP = 2;
const SCREEN_WIDTH = Dimensions.get('window').width;
const CELL_SIZE = (SCREEN_WIDTH - GAP * (COLUMNS + 1)) / COLUMNS;

function XPBar({ xp, level }: { xp: number; level: number }) {
  const progress = (xp % XP_PER_LEVEL) / XP_PER_LEVEL;
  return (
    <View>
      <View className="flex-row justify-between mb-1">
        <Text className="text-xs text-zinc-500 dark:text-zinc-400">დონე {level}</Text>
        <Text className="text-xs text-zinc-500 dark:text-zinc-400">{xp} XP</Text>
      </View>
      <View className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
        <View className="h-full rounded-full bg-amber-500" style={{ width: `${Math.min(progress * 100, 100)}%` }} />
      </View>
    </View>
  );
}

function GridPostCell({ item }: { item: MobilePostType }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/(app)/post/[id]', params: { id: String(item.id) } })}
      style={{ width: CELL_SIZE, height: CELL_SIZE, margin: GAP / 2 }}
    >
      <Image source={{ uri: item.image }} style={{ width: CELL_SIZE, height: CELL_SIZE }} resizeMode="cover" />
    </Pressable>
  );
}

export default function UserProfileScreen() {
  const { alias } = useLocalSearchParams<{ alias: string }>();
  const insets = useSafeAreaInsets();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['user-profile', alias],
    queryFn: () => usersApi.getProfile(alias),
    enabled: !!alias,
  });

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

  const { user, profilePhoto, level, posts } = data;

  const ListHeader = (
    <View className="mx-4 mt-4 mb-4 bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-100 dark:border-zinc-800">
      <View className="flex-row gap-4 items-center">
        <ProfileAvatar name={user.alias} photoUrl={profilePhoto?.url ?? null} size={64} shape="md" />
        <View className="flex-1">
          <Text className="text-xl font-bold text-zinc-900 dark:text-zinc-50">&apos;{user.alias}</Text>
          {user.age != null ? (
            <Text className="text-xs text-zinc-400 mt-1">ასაკი: {user.age} დღე</Text>
          ) : null}
          {level ? (
            <View className="mt-3">
              <XPBar xp={level.xp} level={level.level} />
            </View>
          ) : null}
        </View>
      </View>
      <View className="mt-3 flex-row items-center gap-1">
        <Text className="text-sm text-zinc-500 dark:text-zinc-400">{posts.length} პოსტი</Text>
      </View>
    </View>
  );

  return (
    <FlatList
      className="flex-1 bg-zinc-50 dark:bg-zinc-950"
      contentContainerStyle={{ paddingBottom: insets.bottom + 16, paddingHorizontal: GAP / 2 }}
      data={posts}
      keyExtractor={(item) => String(item.id)}
      numColumns={COLUMNS}
      renderItem={({ item }) => <GridPostCell item={item} />}
      ListHeaderComponent={ListHeader}
      ListEmptyComponent={
        <View className="py-10 items-center">
          <Text className="text-sm text-zinc-500 dark:text-zinc-400">პოსტები არ არის</Text>
        </View>
      }
    />
  );
}
