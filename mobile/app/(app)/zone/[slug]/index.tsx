import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ZoneHeader } from '@/components/zone/ZoneHeader';
import { ZoneFeedTab } from '@/components/zone/ZoneFeedTab';
import { MembersTab } from '@/components/zone/MembersTab';
import { LeaderboardTab } from '@/components/zone/LeaderboardTab';
import { ManageTab } from '@/components/zone/ManageTab';
import { QuestsTab } from '@/components/zone/QuestsTab';
import { zonesApi } from '@/lib/zones';

type Tab = 'feed' | 'members' | 'leaderboard' | 'quests' | 'manage';

export default function ZoneScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const navigation = useNavigation();
  const [tab, setTab] = useState<Tab>('feed');

  const { data: meta, isLoading, isError, refetch } = useQuery({
    queryKey: ['zone-meta', slug],
    queryFn: () => zonesApi.getMeta(slug),
    enabled: !!slug,
  });

  useEffect(() => {
    if (slug) navigation.setOptions({ title: slug });
  }, [slug, navigation]);

  const tabs = useMemo(() => {
    const list: { id: Tab; label: string }[] = [
      { id: 'feed', label: 'ფიდი' },
      { id: 'members', label: 'წევრები' },
      { id: 'leaderboard', label: 'ლიდერბორდი' },
    ];
    if (meta?.questsEnabled) list.push({ id: 'quests', label: 'მისიები' });
    if (meta?.canManage) list.push({ id: 'manage', label: 'მართვა' });
    return list;
  }, [meta?.questsEnabled, meta?.canManage]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <ActivityIndicator size="large" color="#14B8A6" />
      </View>
    );
  }

  if (isError || !meta) {
    return (
      <View className="flex-1 items-center justify-center px-8 bg-zinc-50 dark:bg-zinc-950">
        <Text className="text-zinc-500 dark:text-zinc-400 text-sm text-center mb-4">საბზონის ჩატვირთვა ვერ მოხერხდა</Text>
        <Pressable onPress={() => refetch()} className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
          <Text className="text-brand text-sm font-semibold">ხელახლა ცდა</Text>
        </Pressable>
      </View>
    );
  }

  const isPrivateLocked =
    meta.zone.visibility === 'private' && meta.membership?.status !== 'active';

  return (
    <View className="flex-1 bg-zinc-50 dark:bg-zinc-950">
      <ZoneHeader meta={meta} slug={slug} />

      {isPrivateLocked ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-sm text-zinc-500 dark:text-zinc-400 text-center">
            ეს საბზონა დახურულია. შინაარსის სანახავად გაწევრიანდი.
          </Text>
        </View>
      ) : (
        <>
          {/* Segmented tab bar */}
          <View className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10 }}
            >
              {tabs.map((t) => {
                const active = t.id === tab;
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => setTab(t.id)}
                    className={`px-4 py-1.5 rounded-full border ${
                      active ? 'bg-teal-600 border-teal-600' : 'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700'
                    }`}
                  >
                    <Text className={`text-sm font-medium ${active ? 'text-white' : 'text-zinc-700 dark:text-zinc-300'}`}>
                      {t.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View className="flex-1">
            {tab === 'feed' ? <ZoneFeedTab slug={slug} /> : null}
            {tab === 'members' ? <MembersTab slug={slug} /> : null}
            {tab === 'leaderboard' ? <LeaderboardTab slug={slug} /> : null}
            {tab === 'quests' ? <QuestsTab slug={slug} /> : null}
            {tab === 'manage' ? <ManageTab slug={slug} /> : null}
          </View>
        </>
      )}
    </View>
  );
}
