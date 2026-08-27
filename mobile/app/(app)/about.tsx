import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { aboutApi } from '@/lib/about';

const ISSUES_URL = 'https://github.com/newfolder42/gspot-web/issues';
const INITIAL_RELEASES = 5;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mx-4 mb-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
      <View className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
        <Text className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{title}</Text>
      </View>
      {children}
    </View>
  );
}

/** Mirrors web /about — intro, features, roadmap, tech chips and the changelog. */
export default function AboutScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [expanded, setExpanded] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['about'],
    queryFn: () => aboutApi.get(),
    staleTime: 60 * 60_000,
  });

  useEffect(() => {
    navigation.setOptions({ title: 'ჩვენ შესახებ' });
  }, [navigation]);

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
        <Text className="text-sm text-zinc-500 dark:text-zinc-400 text-center mb-4">
          ჩატვირთვა ვერ მოხერხდა
        </Text>
        <Pressable onPress={() => refetch()} className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
          <Text className="text-brand text-sm font-semibold">ხელახლა ცდა</Text>
        </Pressable>
      </View>
    );
  }

  const releases = expanded ? data.changelog : data.changelog.slice(0, INITIAL_RELEASES);

  return (
    <ScrollView className="flex-1 bg-zinc-50 dark:bg-zinc-950" contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 + insets.bottom }}>
      {/* Intro */}
      <Section title={`${data.appName}-ის შესახებ`}>
        <View className="px-4 py-3">
          <Text className="text-sm text-zinc-600 dark:text-zinc-400 leading-5">
            {data.appName} არის ქართული გასართობი პორტალი ფოტო-სურათების გეო ლოკაციის გამოსაცნობად.
            საიტზე რეგისტრაციის შემდგომ შეგიძლია ატვირთო ფოტო-სურათი რომელსაც აქვს გეო ლოკაციის თაგი,
            და სხვას მისცე საშუალება გამოიცნოს სადაა გადაღებული.
          </Text>
          <Text className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-5">
            საიტის დეველოპმენტი ხორციელდება სწავლისა და გამოცდილების გაზრდის მიზნით, ასევე გართობის.
          </Text>
          <Text className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-5">
            უკუკავშირისთვის გადადი{' '}
            <Text className="text-teal-600 dark:text-teal-400" onPress={() => Linking.openURL(ISSUES_URL)}>
              ბმულზე
            </Text>
          </Text>
        </View>
        <View className="flex-row flex-wrap gap-2 px-4 pb-4">
          {data.technologies.map((tech) => (
            <View
              key={tech}
              className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 px-2 py-1"
            >
              <Text className="text-xs text-zinc-700 dark:text-zinc-200">{tech}</Text>
            </View>
          ))}
        </View>
      </Section>

      {/* Features */}
      <Section title="შესაძლებლობები">
        <View className="px-4 py-3">
          {data.features.map((f) => (
            <View key={f.title} className="flex-row gap-2 mb-3">
              <View className="mt-1.5 h-2 w-2 rounded-full bg-green-500" />
              <View className="flex-1">
                <Text className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{f.title}</Text>
                <Text className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 leading-4">{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </Section>

      {/* Roadmap */}
      <Section title="გეგმები">
        <View className="px-4 py-3">
          {data.roadmap.map((r) => (
            <View key={r.title} className="flex-row gap-2 mb-3">
              <View className="mt-1.5 h-2 w-2 rounded-full bg-teal-500" />
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <Text className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{r.title}</Text>
                  <Text className="text-xs text-zinc-500 dark:text-zinc-400">{r.status}</Text>
                </View>
                <Text className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 leading-4">{r.note}</Text>
              </View>
            </View>
          ))}
        </View>
      </Section>

      {/* Changelog */}
      <Section title="ცვლილებები">
        {releases.map((rel) => (
          <View key={rel.version} className="border-b border-zinc-200 dark:border-zinc-800">
            <View className="flex-row items-center justify-between px-4 py-2 bg-zinc-50 dark:bg-zinc-900">
              <Text className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{rel.version}</Text>
              <Text className="text-xs text-zinc-500 dark:text-zinc-400">{rel.date}</Text>
            </View>
            <View className="px-4 py-3">
              {rel.items.map((it, i) => (
                <Text key={i} className="text-sm text-zinc-700 dark:text-zinc-200 leading-5 mb-1">
                  • {it}
                </Text>
              ))}
            </View>
          </View>
        ))}
        {!expanded && data.changelog.length > INITIAL_RELEASES ? (
          <Pressable onPress={() => setExpanded(true)} className="px-4 py-3">
            <Text className="text-sm text-teal-600 dark:text-teal-400">მეტის ნახვა</Text>
          </Pressable>
        ) : null}
      </Section>
    </ScrollView>
  );
}
