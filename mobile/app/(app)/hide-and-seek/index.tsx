import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { LevelBadge } from '@/components/ui/LevelBadge';
import { useCountdown } from '@/components/hideandseek/useCountdown';
import { hideAndSeekApi } from '@/lib/hideAndSeek';
import { formatMinutes } from '@/types/hide-and-seek';
import type { HideAndSeekListFilter, HideAndSeekListItemType } from '@/types/hide-and-seek';
import { Colors, useTheme } from '@/constants/colors';

const FILTERS: { key: HideAndSeekListFilter; label: string }[] = [
  { key: 'all', label: 'ყველა' },
  { key: 'active', label: 'მიმდინარე' },
  { key: 'ended', label: 'დასრულებული' },
];

function GameRow({ game }: { game: HideAndSeekListItemType }) {
  const theme = useTheme();
  const router = useRouter();
  const { label, expired } = useCountdown(game.endsAt);
  const live = game.status === 'active' && !expired;

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/(app)/post/[id]', params: { id: String(game.postId) } })}
      className="flex-row items-start gap-3 rounded-lg p-3 mb-2"
      style={{ borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface }}
    >
      <View
        className="w-10 h-10 rounded-lg items-center justify-center"
        style={{ backgroundColor: live ? Colors.brand : theme.surfaceAlt }}
      >
        <Feather name="eye" size={18} color={live ? Colors.onAccent : theme.icon} />
      </View>

      <View className="flex-1">
        <View className="flex-row items-center gap-1.5 flex-wrap">
          <Text className="text-sm font-bold flex-shrink" style={{ color: theme.text }} numberOfLines={1}>
            {game.title}
          </Text>
          {game.visibility === 'private' && <Feather name="lock" size={11} color={theme.iconFaint} />}
          {game.viewerRole && (
            <View className="rounded-full px-1.5 py-0.5" style={{ backgroundColor: theme.surfaceAlt }}>
              <Text className="text-[11px] font-bold" style={{ color: Colors.brand }}>
                {game.viewerRole === 'host' ? 'შენ იმალები' : 'შენ ეძებ'}
              </Text>
            </View>
          )}
        </View>

        <View className="flex-row items-center gap-1.5 mt-0.5">
          <Text className="text-xs" style={{ color: theme.textMuted }}>{game.hostAlias}</Text>
          {game.hostLevel != null && <LevelBadge level={game.hostLevel} />}
          <Text className="text-xs" style={{ color: theme.iconFaint }}>•</Text>
          <Text className="text-xs" style={{ color: theme.textMuted }}>{game.zoneSlug}</Text>
        </View>

        <View className="flex-row items-center gap-3 mt-1">
          <Text className="text-xs" style={{ color: theme.textMuted }}>{game.playerCount} მოთამაშე</Text>
          <Text className="text-xs" style={{ color: theme.textMuted }}>{game.foundCount} იპოვა</Text>
          <Text className="text-xs" style={{ color: theme.textMuted }}>{formatMinutes(game.durationMinutes)}</Text>
        </View>
      </View>

      <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: live ? Colors.brand : theme.surfaceAlt }}>
        <Text className="text-xs font-bold" style={{ color: live ? Colors.onAccent : theme.textMuted }}>
          {live ? label : 'დასრულდა'}
        </Text>
      </View>
    </Pressable>
  );
}

export default function HideAndSeekListScreen() {
  const theme = useTheme();
  const [filter, setFilter] = useState<HideAndSeekListFilter>('all');

  const query = useQuery({
    queryKey: ['hide-and-seek', 'list', filter],
    queryFn: () => hideAndSeekApi.list(filter),
  });

  return (
    <View className="flex-1" style={{ backgroundColor: theme.bg }}>
      <View className="flex-row gap-2 px-4 py-3">
        {FILTERS.map((f) => {
          const selected = filter === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              className="rounded-full px-3 py-1.5"
              style={{
                backgroundColor: selected ? Colors.brand : 'transparent',
                borderWidth: selected ? 0 : 1,
                borderColor: theme.border,
              }}
            >
              <Text
                className="text-sm font-medium"
                style={{ color: selected ? Colors.onAccent : theme.textMuted }}
              >
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {query.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={Colors.brand} />
        </View>
      ) : (
        <FlatList
          data={query.data ?? []}
          keyExtractor={(item) => String(item.gameId)}
          renderItem={({ item }) => <GameRow game={item} />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl refreshing={query.isFetching} onRefresh={() => query.refetch()} tintColor={Colors.brand} />
          }
          ListEmptyComponent={
            <Text className="text-center text-sm py-10" style={{ color: theme.textMuted }}>
              {filter === 'active' ? 'მიმდინარე თამაში არ არის.' : 'თამაში ჯერ არ არის.'}
            </Text>
          }
        />
      )}
    </View>
  );
}
