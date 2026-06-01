import { ActivityIndicator, Alert, Dimensions, FlatList, Image, Pressable, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import type { OwnAccountData } from './account.types';
import type { MobilePostType } from '@/types/post';

const COLUMNS = 3;
const GAP = 2;
const SCREEN_WIDTH = Dimensions.get('window').width;
const CELL_SIZE = (SCREEN_WIDTH - GAP * (COLUMNS + 1)) / COLUMNS;

// ─── Avatar ──────────────────────────────────────────────────────────────────

function getInitials(alias: string): string {
  return alias.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#EF4444',
  '#F97316', '#EAB308', '#22C55E', '#14B8A6',
  '#3B82F6', '#06B6D4',
];

function getAvatarColor(alias: string): string {
  let hash = 0;
  for (let i = 0; i < alias.length; i++) {
    hash = alias.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function Avatar({ alias, photoUrl }: { alias: string; photoUrl: string | null }) {
  const bg = getAvatarColor(alias);
  if (photoUrl) {
    return (
      <Image
        source={{ uri: photoUrl }}
        className="h-20 w-20 rounded-md"
        resizeMode="cover"
      />
    );
  }

  return (
    <View
      className="h-20 w-20 rounded-md items-center justify-center"
      style={{ backgroundColor: bg }}
    >
      <Text className="text-white text-2xl font-bold">{getInitials(alias)}</Text>
    </View>
  );
}

// ─── XP Bar ──────────────────────────────────────────────────────────────────

const XP_PER_LEVEL = 100;

function XPBar({ xp, level }: { xp: number; level: number }) {
  const progress = (xp % XP_PER_LEVEL) / XP_PER_LEVEL;
  return (
    <View>
      <View className="flex-row justify-between mb-1">
        <Text className="text-xs text-zinc-500 dark:text-zinc-400">დონე {level}</Text>
        <Text className="text-xs text-zinc-500 dark:text-zinc-400">{xp} XP</Text>
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

// ─── Row ─────────────────────────────────────────────────────────────────────

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View className="flex-row items-center py-3.5 border-b border-zinc-100 dark:border-zinc-800">
      <Feather name={icon as any} size={18} color="#71717A" />
      <Text className="text-zinc-500 dark:text-zinc-400 ml-3 text-sm w-24">{label}</Text>
      <Text className="flex-1 text-zinc-800 dark:text-zinc-200 text-sm text-right">{value}</Text>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function AccountScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const { data, isLoading, error, refetch } = useQuery<OwnAccountData>({
    queryKey: ['account', 'me'],
    queryFn: () => apiClient.get('/account/me').then((r) => r.data),
    enabled: !!user,
  });

  const postsQuery = useQuery<{ posts: MobilePostType[] }>({
    queryKey: ['user-profile', user?.alias],
    queryFn: () => apiClient.get(`/users/${user!.alias}`).then((r) => r.data),
    enabled: !!user?.alias,
  });

  const handleLogout = () => {
    Alert.alert('გასვლა', 'დარწმუნებული ხარ, რომ გსურს გასვლა?', [
      { text: 'გაუქმება', style: 'cancel' },
      { text: 'გასვლა', style: 'destructive', onPress: logout },
    ]);
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <ActivityIndicator size="large" color="#14B8A6" />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View className="flex-1 items-center justify-center px-8 bg-zinc-50 dark:bg-zinc-950">
        <Text className="text-zinc-500 dark:text-zinc-400 text-sm text-center mb-4">
          ანგარიშის ჩატვირთვა ვერ მოხერხდა.
        </Text>
        <Pressable onPress={() => refetch()} className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
          <Text className="text-brand text-sm font-semibold">ხელახლა ცდა</Text>
        </Pressable>
      </View>
    );
  }

  const { user: profile, profilePhoto, level } = data;
  const ageLabel = profile.age ? String(profile.age) : '-';

  const posts: MobilePostType[] = postsQuery.data?.posts ?? [];

  // Build 3-column rows for the grid
  type GridRow = { key: string; items: MobilePostType[] };
  const rows: GridRow[] = [];
  for (let i = 0; i < posts.length; i += COLUMNS) {
    rows.push({ key: `row-${i}`, items: posts.slice(i, i + COLUMNS) });
  }

  const ListHeader = (
    <View>
      {/* Profile card */}
      <View className="mx-4 mt-4 bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-100 dark:border-zinc-800">
        <View className="flex-row gap-4 items-center">
          <Avatar alias={profile.alias} photoUrl={profilePhoto?.url ?? null} />
          <View className="flex-1">
            <Text className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              &apos;{profile.alias}
            </Text>
            <Text className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
              ასაკი: {ageLabel} დღე
            </Text>
            <View className="mt-3">
              {level ? <XPBar xp={level.xp} level={level.level} /> : null}
            </View>
          </View>
        </View>
        <View className="mt-3 flex-row items-center gap-1">
          <Text className="text-sm text-zinc-500 dark:text-zinc-400">{posts.length} პოსტი</Text>
        </View>
      </View>

      {/* Actions */}
      <View className="mx-4 mt-3 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden">
        <Pressable
          onPress={handleLogout}
          className="flex-row items-center px-4 py-4 active:bg-zinc-50 dark:active:bg-zinc-800"
          android_ripple={{ color: 'rgba(0,0,0,0.05)' }}
        >
          <Feather name="log-out" size={18} color="#EF4444" />
          <Text className="text-red-500 ml-3 text-base font-medium">გასვლა</Text>
        </Pressable>
      </View>

      {/* Grid header */}
      {posts.length > 0 ? (
        <View className="px-4 pt-5 pb-2">
          <Text className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">პოსტები</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <FlatList
      className="flex-1 bg-zinc-50 dark:bg-zinc-950"
      contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: GAP / 2 }}
      data={rows}
      keyExtractor={(row) => row.key}
      renderItem={({ item: row }) => (
        <View style={{ flexDirection: 'row' }}>
          {row.items.map((post) => (
            <Pressable
              key={post.id}
              onPress={() => router.push({ pathname: '/(app)/post/[id]', params: { id: String(post.id) } })}
              style={{ width: CELL_SIZE, height: CELL_SIZE, margin: GAP / 2 }}
            >
              <Image source={{ uri: post.image }} style={{ width: CELL_SIZE, height: CELL_SIZE }} resizeMode="cover" />
            </Pressable>
          ))}
          {/* Fill empty cells in last row */}
          {row.items.length < COLUMNS
            ? Array.from({ length: COLUMNS - row.items.length }).map((_, i) => (
                <View key={`empty-${i}`} style={{ width: CELL_SIZE, height: CELL_SIZE, margin: GAP / 2 }} />
              ))
            : null}
        </View>
      )}
      ListHeaderComponent={ListHeader}
      ListEmptyComponent={
        postsQuery.isLoading ? (
          <View className="py-10 items-center"><ActivityIndicator color="#14B8A6" /></View>
        ) : (
          <View className="py-10 items-center">
            <Text className="text-sm text-zinc-500 dark:text-zinc-400">პოსტები არ არის</Text>
          </View>
        )
      }
    />
  );
}
