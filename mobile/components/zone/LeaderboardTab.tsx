import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { LevelBadge } from '@/components/ui/LevelBadge';
import { zonesApi, type LeaderboardEntry } from '@/lib/zones';

const PODIUM_META = [
  { height: 64, bg: '#cbd5e1', label: '#2' },
  { height: 96, bg: '#fbbf24', label: '#1' },
  { height: 40, bg: '#b87333', label: '#3' },
] as const;

function Podium({ top3 }: { top3: (LeaderboardEntry | undefined)[] }) {
  const router = useRouter();
  // order: 2nd, 1st, 3rd
  const order = [top3[1], top3[0], top3[2]];
  return (
    <View className="flex-row items-end justify-center gap-3 mb-8 pt-4">
      {order.map((entry, i) => {
        const meta = PODIUM_META[i];
        return (
          <View key={i} className="items-center justify-end" style={{ width: 96 }}>
            {entry ? (
              <Pressable className="items-center mb-2" onPress={() => router.push({ pathname: '/(app)/user/[alias]', params: { alias: entry.alias } })}>
                <View className="h-10 w-10 rounded-full items-center justify-center mb-1" style={{ backgroundColor: meta.bg }}>
                  <Text className="text-base font-bold text-zinc-900">{meta.label}</Text>
                </View>
                <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-100" numberOfLines={1}>&apos;{entry.alias}</Text>
                {entry.level != null ? <LevelBadge level={entry.level} /> : null}
                <Text className="text-xs text-zinc-500 dark:text-zinc-400">{entry.rating} ქ.</Text>
              </Pressable>
            ) : null}
            <View className="w-full rounded-t-md" style={{ height: meta.height, backgroundColor: entry ? meta.bg : '#e4e4e7' }} />
          </View>
        );
      })}
    </View>
  );
}

export function LeaderboardTab({ slug }: { slug: string }) {
  const router = useRouter();
  const [period, setPeriod] = useState<string | undefined>(undefined);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['zone-leaderboard', slug, period ?? 'total'],
    queryFn: () => zonesApi.getLeaderboard(slug, period),
    enabled: !!slug,
  });

  if (isLoading) {
    return <View className="py-10 items-center"><ActivityIndicator color="#14B8A6" /></View>;
  }
  if (isError || !data) {
    return (
      <View className="py-10 items-center px-8">
        <Text className="text-sm text-zinc-500 dark:text-zinc-400 mb-3 text-center">ჩატვირთვა ვერ მოხერხდა</Text>
        <Pressable onPress={() => refetch()} className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
          <Text className="text-brand text-sm font-semibold">ხელახლა ცდა</Text>
        </Pressable>
      </View>
    );
  }

  const top3 = data.entries.slice(0, 3);
  const rest = data.entries.slice(3);

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 12 }}>
        {data.periods.map((p) => {
          const active = (period ?? 'total') === p.key;
          return (
            <Pressable
              key={p.key}
              onPress={() => setPeriod(p.key === 'total' ? undefined : p.key)}
              className={`px-3 py-1.5 rounded-full border ${active ? 'bg-teal-600 border-teal-600' : 'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700'}`}
            >
              <Text className={`text-xs font-medium ${active ? 'text-white' : 'text-zinc-700 dark:text-zinc-300'}`}>{p.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {data.entries.length === 0 ? (
        <Text className="text-sm text-zinc-500 dark:text-zinc-400 py-8 text-center">ამ პერიოდისთვის მონაცემები არ არის.</Text>
      ) : (
        <>
          {top3.length > 0 ? <Podium top3={top3} /> : null}
          {rest.map((e, i) => (
            <Pressable
              key={e.userId}
              onPress={() => router.push({ pathname: '/(app)/user/[alias]', params: { alias: e.alias } })}
              className="flex-row items-center justify-between px-4 py-2.5"
            >
              <View className="flex-row items-center gap-3">
                <Text className="w-6 text-right text-sm text-zinc-500 dark:text-zinc-400">{i + 4}</Text>
                <Text className="text-sm text-zinc-900 dark:text-zinc-100">&apos;{e.alias}</Text>
                {e.level != null ? <LevelBadge level={e.level} /> : null}
              </View>
              <Text className="text-sm text-zinc-600 dark:text-zinc-400">{e.rating} ქ.</Text>
            </Pressable>
          ))}
        </>
      )}
    </ScrollView>
  );
}
