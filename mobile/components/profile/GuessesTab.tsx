import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { usersApi } from '@/lib/users';
import { formatPhotoTakenDate } from '@/lib/dates';
import type { UserGuess } from '@/types/guess';

type SortType = 'date' | 'distance';

function formatDistance(distance: number | null): string | null {
  if (distance == null) return null;
  if (distance < 1000) return `${Math.round(distance)} მ`;
  return `${(distance / 1000).toFixed(1)} კმ`;
}

function GuessCard({ guess }: { guess: UserGuess }) {
  const router = useRouter();
  const distance = formatDistance(guess.distance);
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/(app)/post/[id]', params: { id: String(guess.postId) } })}
      className="px-4 py-3.5 border-b border-zinc-100 dark:border-zinc-800"
    >
      <Text className="text-sm font-medium text-zinc-900 dark:text-zinc-50" numberOfLines={2}>
        &apos;{guess.postAuthor}-ის პოსტი{guess.postTitle ? `: ${guess.postTitle}` : ''}
      </Text>
      <View className="flex-row items-center gap-3 mt-1.5">
        {distance ? (
          <View className="flex-row items-center gap-1">
            <Feather name="map-pin" size={13} color="#71717A" />
            <Text className="text-xs text-zinc-500 dark:text-zinc-400">{distance}</Text>
          </View>
        ) : null}
        {guess.score != null ? (
          <View className="flex-row items-center gap-1">
            <Feather name="star" size={13} color="#71717A" />
            <Text className="text-xs text-zinc-500 dark:text-zinc-400">{guess.score}</Text>
          </View>
        ) : null}
        <Text className="text-xs text-zinc-400 ml-auto">{formatPhotoTakenDate(guess.createdAt)}</Text>
      </View>
    </Pressable>
  );
}

const EMPTY_MESSAGES = [
  'უსაქმურობის სუნი დგას...',
  'გამოსაცნობი ჯერ კიდევ ბევრია!',
];

export function GuessesTab({ alias }: { alias: string }) {
  const [sortType, setSortType] = useState<SortType>('date');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['guesses', alias],
    queryFn: () => usersApi.getGuesses(alias),
    enabled: !!alias,
  });

  const sorted = useMemo(() => {
    const list = data ?? [];
    return [...list]
      .sort((a, b) => {
        if (sortType === 'date') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        return (a.distance ?? Infinity) - (b.distance ?? Infinity);
      })
      .slice(0, 15);
  }, [data, sortType]);

  if (isLoading) {
    return <View className="py-10 items-center"><ActivityIndicator color="#14B8A6" /></View>;
  }

  if (isError) {
    return (
      <View className="py-10 items-center px-8">
        <Text className="text-sm text-zinc-500 dark:text-zinc-400 mb-3 text-center">ჩატვირთვა ვერ მოხერხდა</Text>
        <Pressable onPress={() => refetch()} className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
          <Text className="text-brand text-sm font-semibold">ხელახლა ცდა</Text>
        </Pressable>
      </View>
    );
  }

  if ((data?.length ?? 0) === 0) {
    return (
      <View className="py-10 items-center px-8">
        <Text className="text-sm text-zinc-500 dark:text-zinc-400 text-center">{EMPTY_MESSAGES[0]}</Text>
      </View>
    );
  }

  return (
    <View>
      <View className="px-4 py-2 flex-row items-center justify-between">
        <View className="flex-row gap-2">
          {(['date', 'distance'] as const).map((s) => {
            const active = s === sortType;
            return (
              <Pressable
                key={s}
                onPress={() => setSortType(s)}
                className={`px-3 py-1.5 rounded-full border ${
                  active ? 'bg-teal-600 border-teal-600' : 'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700'
                }`}
              >
                <Text className={`text-xs font-medium ${active ? 'text-white' : 'text-zinc-700 dark:text-zinc-300'}`}>
                  {s === 'date' ? 'თარიღით' : 'მანძილით'}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{data?.length ?? 0}</Text>
      </View>
      {sorted.map((g) => (
        <GuessCard key={g.id} guess={g} />
      ))}
    </View>
  );
}
