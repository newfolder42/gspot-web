import { useMemo, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { usersApi } from '@/lib/users';
import { formatPhotoTakenDate } from '@/lib/dates';
import { formatGuessDistance, getGuessScoreColor, GUESS_INDEX_MIN_GUESSES } from '@/lib/guessIndex';
import { GuessIndexPanel } from '@/components/profile/GuessIndexPanel';
import type { UserGuess } from '@/types/guess';
import { useTheme } from '@/constants/colors';

const LIST_SIZE = 5;

function GuessRow({ guess, isLast }: { guess: UserGuess; isLast: boolean }) {
  const theme = useTheme();
  const router = useRouter();
  const scoreColor = guess.score != null ? getGuessScoreColor(guess.score) : null;

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/(app)/post/[id]', params: { id: String(guess.postId) } })}
      className={`flex-row items-start gap-3 px-3 py-2.5 ${isLast ? '' : 'border-b border-zinc-200 dark:border-zinc-800'}`}
    >
      {scoreColor ? (
        <View
          className="mt-0.5 h-9 w-9 items-center justify-center rounded-md"
          style={{ borderWidth: 1, borderColor: scoreColor + '70', backgroundColor: scoreColor + '18' }}
        >
          <Text className="text-sm font-bold" style={{ color: scoreColor }}>
            {guess.score}
          </Text>
        </View>
      ) : (
        <View className="mt-0.5 h-9 w-9 items-center justify-center rounded-md border border-zinc-200 dark:border-zinc-800">
          <Text className="text-sm text-zinc-500 dark:text-zinc-400">—</Text>
        </View>
      )}

      <View className="flex-1">
        <Text className="text-sm font-medium text-zinc-900 dark:text-zinc-50" numberOfLines={1}>
          &apos;{guess.postAuthor}-ის პოსტი{guess.postTitle ? `: ${guess.postTitle}` : ''}
        </Text>
        <View className="mt-0.5 flex-row items-center gap-3">
          {guess.distance != null ? (
            <View className="flex-row items-center gap-1">
              <Feather name="map-pin" size={13} color={theme.icon} />
              <Text className="text-xs text-zinc-500 dark:text-zinc-400">{formatGuessDistance(guess.distance)}</Text>
            </View>
          ) : null}
          <Text className="text-xs text-zinc-500 dark:text-zinc-400 ml-auto">{formatPhotoTakenDate(guess.createdAt)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function GuessList({ title, icon, guesses }: { title: string; icon: ReactNode; guesses: UserGuess[] }) {
  return (
    <View className="overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <View className="flex-row items-center gap-1.5 px-3 py-2 border-b border-zinc-200 dark:border-zinc-800">
        {icon}
        <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{title}</Text>
      </View>
      {guesses.map((guess, i) => (
        <GuessRow key={guess.id} guess={guess} isLast={i === guesses.length - 1} />
      ))}
    </View>
  );
}

const EMPTY_MESSAGES = [
  'უსაქმურობის სუნი დგას...',
  'გამოსაცნობი ჯერ კიდევ ბევრია!',
];

export function GuessesTab({ alias }: { alias: string }) {
  const theme = useTheme();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['guesses', alias],
    queryFn: () => usersApi.getGuesses(alias),
    enabled: !!alias,
  });

  const guesses = useMemo(() => data ?? [], [data]);

  const latest = useMemo(
    () =>
      [...guesses]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, LIST_SIZE),
    [guesses]
  );

  const top = useMemo(
    () =>
      [...guesses]
        .sort((a, b) => {
          const scoreDiff = (b.score ?? -1) - (a.score ?? -1);
          if (scoreDiff !== 0) return scoreDiff;
          return (a.distance ?? Infinity) - (b.distance ?? Infinity);
        })
        .slice(0, LIST_SIZE),
    [guesses]
  );

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

  if (guesses.length === 0) {
    return (
      <View className="py-10 items-center px-8">
        <Text className="text-sm text-zinc-500 dark:text-zinc-400 text-center">{EMPTY_MESSAGES[0]}</Text>
      </View>
    );
  }

  // with only a handful of guesses the index says nothing and the top list just
  // mirrors the latest one, so both stay hidden until there is some history
  const showIndex = guesses.length > GUESS_INDEX_MIN_GUESSES;

  return (
    <View className="px-4 py-3 gap-3">
      {showIndex ? <GuessIndexPanel guesses={guesses} /> : null}

      {showIndex ? (
        <GuessList
          title="საუკეთესო გამოცნობები"
          icon={<Feather name="award" size={16} color="#F59E0B" />}
          guesses={top}
        />
      ) : null}

      <GuessList
        title="ბოლო გამოცნობები"
        icon={<Feather name="list" size={16} color={theme.icon} />}
        guesses={latest}
      />
    </View>
  );
}
