import { useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  Pressable,
  SectionList,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { searchApi, type SearchResults } from '@/lib/search';

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const debouncedQuery = useDebounce(query.trim(), 300);

  // Autofocus and set custom header
  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View className="flex-1 flex-row items-center bg-zinc-800 rounded-xl px-3 py-1.5 gap-2 mx-2">
          <Feather name="search" size={16} color="#71717A" />
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder="ძებნა..."
            placeholderTextColor="#71717A"
            className="flex-1 text-sm text-zinc-100"
            autoFocus
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery('')}>
              <Feather name="x" size={16} color="#71717A" />
            </Pressable>
          ) : null}
        </View>
      ),
      headerRight: () => (
        <Pressable onPress={() => router.back()} className="mr-2">
          <Text className="text-sm text-teal-400">გაუქმება</Text>
        </Pressable>
      ),
    });
  }, [query]);

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults(null);
      return;
    }
    setLoading(true);
    searchApi
      .search(debouncedQuery)
      .then(setResults)
      .catch(() => setResults(null))
      .finally(() => setLoading(false));
  }, [debouncedQuery]);

  type Section = {
    title: string;
    data: { key: string; node: React.ReactNode }[];
  };

  const sections: Section[] = [];

  if (results) {
    if (results.users.length > 0) {
      sections.push({
        title: 'მომხმარებლები',
        data: results.users.map((u) => ({
          key: `user-${u.id}`,
          node: (
            <Pressable
              className="flex-row items-center gap-3 px-4 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800"
              onPress={() =>
                router.push({ pathname: '/(app)/user/[alias]', params: { alias: u.alias } })
              }
            >
              <ProfileAvatar name={u.alias} photoUrl={null} size={36} shape="md" />
              <View>
                <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  &apos;{u.alias}
                </Text>
                {u.age != null ? (
                  <Text className="text-xs text-zinc-400">{u.age} დღე</Text>
                ) : null}
              </View>
            </Pressable>
          ),
        })),
      });
    }

    if (results.zones.length > 0) {
      sections.push({
        title: 'საბზონები',
        data: results.zones.map((z) => ({
          key: `zone-${z.id}`,
          node: (
            <Pressable
              className="flex-row items-center gap-3 px-4 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800"
              onPress={() =>
                router.push({ pathname: '/(app)/zone/[slug]', params: { slug: z.slug } })
              }
            >
              <ProfileAvatar name={z.slug} photoUrl={z.profilePhotoUrl} size={36} shape="md" />
              <View className="flex-1">
                <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  {z.slug}
                </Text>
                {z.description ? (
                  <Text className="text-xs text-zinc-400" numberOfLines={1}>
                    {z.description}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          ),
        })),
      });
    }

    if (results.posts.length > 0) {
      sections.push({
        title: 'პოსტები',
        data: results.posts.map((p) => ({
          key: `post-${p.id}`,
          node: (
            <Pressable
              className="flex-row items-center gap-3 px-4 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800"
              onPress={() =>
                router.push({ pathname: '/(app)/post/[id]', params: { id: String(p.id) } })
              }
            >
              <Feather name="image" size={20} color="#71717A" />
              <View className="flex-1">
                <Text className="text-sm text-zinc-900 dark:text-zinc-50" numberOfLines={1}>
                  {p.title || '(სათაური არ არის)'}
                </Text>
                <Text className="text-xs text-zinc-400">&apos;{p.author}</Text>
              </View>
            </Pressable>
          ),
        })),
      });
    }
  }

  const noResults =
    results !== null &&
    results.users.length === 0 &&
    results.posts.length === 0 &&
    results.zones.length === 0;

  return (
    <View className="flex-1 bg-zinc-50 dark:bg-zinc-950">
      {loading ? (
        <View className="pt-8 items-center">
          <ActivityIndicator color="#14B8A6" />
        </View>
      ) : noResults ? (
        <View className="pt-16 items-center px-8">
          <Text className="text-sm text-zinc-500 dark:text-zinc-400 text-center">
            შედეგი ვერ მოიძებნა
          </Text>
        </View>
      ) : sections.length > 0 ? (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.key}
          contentContainerStyle={{ paddingBottom: insets.bottom }}
          renderItem={({ item }) => <>{item.node}</>}
          renderSectionHeader={({ section }) => (
            <View className="px-4 py-2 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
              <Text className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                {section.title}
              </Text>
            </View>
          )}
        />
      ) : (
        <View className="pt-16 items-center px-8">
          <Feather name="search" size={40} color="#3F3F46" />
          <Text className="mt-4 text-sm text-zinc-500 dark:text-zinc-400 text-center">
            ძებნისთვის მინიმუმ 2 სიმბოლო შეიყვანე
          </Text>
        </View>
      )}
    </View>
  );
}
