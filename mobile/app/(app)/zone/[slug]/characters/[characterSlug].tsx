import { useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { questsApi } from '@/lib/quests';

export default function CharacterDetailScreen() {
  const { slug, characterSlug } = useLocalSearchParams<{ slug: string; characterSlug: string }>();
  const navigation = useNavigation();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['character', slug, characterSlug],
    queryFn: () => questsApi.getCharacter(slug, characterSlug),
    enabled: !!slug && !!characterSlug,
  });

  useEffect(() => {
    if (data?.name) navigation.setOptions({ title: data.name });
  }, [data?.name, navigation]);

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
        <Text className="text-zinc-500 dark:text-zinc-400 text-sm text-center mb-4">პერსონაჟის ჩატვირთვა ვერ მოხერხდა</Text>
        <Pressable onPress={() => refetch()} className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
          <Text className="text-brand text-sm font-semibold">ხელახლა ცდა</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-zinc-50 dark:bg-zinc-950" contentContainerStyle={{ padding: 16 }}>
      <View className="flex-row items-center gap-4">
        <ProfileAvatar name={data.name} photoUrl={data.avatar_url} size={72} shape="full" />
        <View className="flex-1">
          <Text className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{data.name}</Text>
        </View>
      </View>
      {data.description ? (
        <Text className="text-sm text-zinc-600 dark:text-zinc-300 mt-4 leading-6">{data.description}</Text>
      ) : null}
    </ScrollView>
  );
}
