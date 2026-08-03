import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useNavigation } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { HeatmapMap } from '@/components/HeatmapMap';
import { heatmapApi } from '@/lib/heatmap';

type Scope = 'global' | 'me';

const SCOPES: { id: Scope; label: string }[] = [
  { id: 'global', label: 'ყველა' },
  { id: 'me', label: 'ჩემი' },
];

/**
 * Post heatmap — covers both web pages: /heatmap (global) and the own-posts
 * heatmap tab on the account profile, switched by the segmented control.
 */
export default function HeatmapScreen() {
  const navigation = useNavigation();
  const [scope, setScope] = useState<Scope>('global');

  useEffect(() => {
    navigation.setOptions({ title: 'პოსტების რუკა' });
  }, [navigation]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['heatmap', scope],
    queryFn: () => heatmapApi.get(scope),
    staleTime: 5 * 60_000,
  });

  return (
    <View className="flex-1 bg-zinc-50 dark:bg-zinc-950">
      {/* Scope switch */}
      <View className="flex-row gap-2 px-4 pt-3 pb-2">
        {SCOPES.map((s) => {
          const active = s.id === scope;
          return (
            <Pressable
              key={s.id}
              onPress={() => setScope(s.id)}
              className={`px-4 py-1.5 rounded-full border ${
                active ? 'bg-teal-600 border-teal-600' : 'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700'
              }`}
            >
              <Text className={`text-sm font-medium ${active ? 'text-white' : 'text-zinc-700 dark:text-zinc-300'}`}>
                {s.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Counts line – mirrors the web header */}
      <View className="px-4 pb-2">
        <Text className="text-xs text-zinc-400 dark:text-zinc-500">
          {data
            ? `${data.totalPosts} პოსტი · ${data.points.length} ლოკაცია (${data.gridMeters}მ)`
            : ' '}
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#14B8A6" />
        </View>
      ) : isError || !data ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-sm text-zinc-500 dark:text-zinc-400 text-center mb-4">
            რუკის ჩატვირთვა ვერ მოხერხდა
          </Text>
          <Pressable onPress={() => refetch()} className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
            <Text className="text-brand text-sm font-semibold">ხელახლა ცდა</Text>
          </Pressable>
        </View>
      ) : (
        <HeatmapMap
          points={data.points}
          maxZoom={data.maxZoom}
          pointZoom={data.maxZoom}
          emptyMessage={
            scope === 'me'
              ? 'ჯერ არცერთი პოსტი არ გაქვს კოორდინატებით.'
              : 'ჯერ არცერთი პოსტი არ არის კოორდინატებით.'
          }
        />
      )}
    </View>
  );
}
