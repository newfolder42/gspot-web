import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ZoneHeader } from '@/components/zone/ZoneHeader';
import { ZoneTabBar, type ZoneTabId } from '@/components/zone/ZoneTabBar';
import { ZoneFeedTab } from '@/components/zone/ZoneFeedTab';
import { LeaderboardTab } from '@/components/zone/LeaderboardTab';
import { ManageTab } from '@/components/zone/ManageTab';
import { QuestsTab } from '@/components/zone/QuestsTab';
import { zonesApi } from '@/lib/zones';

type Tab = ZoneTabId;

export default function ZoneScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
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
      { id: 'feed', label: 'ძირითადი' },
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

  // Header (banner/avatar/description) and the tab bar scroll away with the
  // content, Reddit-style, instead of pinning a large fixed block on screen.
  const header = (
    <>
      <ZoneHeader meta={meta} slug={slug} />
      <ZoneTabBar tabs={tabs} tab={tab} onChange={setTab} />
    </>
  );

  if (isPrivateLocked) {
    return (
      <View className="flex-1 bg-zinc-50 dark:bg-zinc-950">
        {header}
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-sm text-zinc-500 dark:text-zinc-400 text-center">
            ეს საბზონა დახურულია. შინაარსის სანახავად გაწევრიანდი.
          </Text>
        </View>
      </View>
    );
  }

  if (tab === 'feed') {
    return (
      <View className="flex-1 bg-zinc-50 dark:bg-zinc-950">
        <ZoneFeedTab slug={slug} header={header} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-zinc-50 dark:bg-zinc-950">
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}>
        {header}
        {tab === 'leaderboard' ? <LeaderboardTab slug={slug} /> : null}
        {tab === 'quests' ? <QuestsTab slug={slug} /> : null}
        {tab === 'manage' ? <ManageTab slug={slug} /> : null}
      </ScrollView>
    </View>
  );
}
