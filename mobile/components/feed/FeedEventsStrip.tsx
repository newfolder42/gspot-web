import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { FeedEventViewer } from '@/components/feed/FeedEventViewer';
import { feedEventsApi } from '@/lib/feedEvents';
import { feedEventPreviewImage } from '@/types/feed-event';
import type { FeedEvent, FeedEventType, OwnFeedEvent } from '@/types/feed-event';
import { useTheme } from '@/constants/colors';

const BUBBLE = 64;

function BubblePreview({
  image,
  type,
  ringColor,
  label,
  busy,
}: {
  image: string | null;
  type: FeedEventType;
  ringColor: string;
  label: string;
  busy?: boolean;
}) {
  return (
    <View className="items-center gap-1" style={{ width: 72 }}>
      <View
        style={{
          width: BUBBLE,
          height: BUBBLE,
          borderRadius: BUBBLE / 2,
          padding: 2,
          backgroundColor: ringColor,
        }}
      >
        <View
          className="items-center justify-center bg-zinc-100 dark:bg-zinc-800 overflow-hidden"
          style={{ width: '100%', height: '100%', borderRadius: BUBBLE / 2 }}
        >
          {busy ? (
            <ActivityIndicator size="small" color="#14B8A6" />
          ) : image ? (
            <Image source={{ uri: image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <Feather name={type === 'achievement_unlocked' ? 'award' : 'flag'} size={24} color="#F59E0B" />
          )}
        </View>
      </View>
      <Text className="text-[11px] text-zinc-600 dark:text-zinc-400 text-center leading-tight" numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

/**
 * The "ამბები" strip — mirrors web FeedEvents. Renders nothing when there is
 * nothing to show, so it costs no vertical space on a quiet feed.
 */
export function FeedEventsStrip() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { story } = useLocalSearchParams<{ story?: string }>();
  const [openingKey, setOpeningKey] = useState<string | null>(null);
  const [viewer, setViewer] = useState<
    { mode: 'others'; events: FeedEvent[] } | { mode: 'own'; events: OwnFeedEvent[] } | null
  >(null);

  const { data, isLoading } = useQuery({
    queryKey: ['feed-events'],
    queryFn: () => feedEventsApi.getStrip(),
    staleTime: 60_000,
  });

  const bubbles = data?.bubbles ?? [];
  const own = data?.own ?? [];

  // story=own — deep link used by the "მოიწონა შენი ამბავი" notification. The
  // param is cleared once consumed so returning to the tab doesn't reopen it.
  useEffect(() => {
    if (story !== 'own' || own.length === 0) return;
    setViewer({ mode: 'own', events: own });
    router.setParams({ story: undefined });
  }, [story, own, router]);

  const openGroup = async (groupKey: string) => {
    if (openingKey) return;
    setOpeningKey(groupKey);
    try {
      const events = await feedEventsApi.getGroup(groupKey);
      if (events.length > 0) setViewer({ mode: 'others', events });
    } catch {
      // a failed open just leaves the strip untouched
    } finally {
      setOpeningKey(null);
    }
  };

  const closeViewer = () => {
    setViewer(null);
    // reflect newly-seen state in the rings
    queryClient.invalidateQueries({ queryKey: ['feed-events'] });
  };

  if (isLoading || (bubbles.length === 0 && own.length === 0)) return null;

  return (
    <View className="bg-zinc-50 dark:bg-zinc-950">
      <Text className="px-3 pt-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        ამბები
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexDirection: 'row', gap: 12, paddingHorizontal: 12, paddingVertical: 8 }}
      >
        {own.length > 0 ? (
          <Pressable onPress={() => setViewer({ mode: 'own', events: own })}>
            <BubblePreview
              image={feedEventPreviewImage(own[0].details, own[0].type)}
              type={own[0].type}
              ringColor="#14B8A6"
              label="შენი ამბები"
            />
          </Pressable>
        ) : null}

        {bubbles.map((b) => (
          <Pressable key={b.groupKey} onPress={() => openGroup(b.groupKey)} disabled={openingKey === b.groupKey}>
            <BubblePreview
              image={b.previewImage}
              type={b.type}
              ringColor={b.hasUnseen ? '#14B8A6' : theme.borderStrong}
              label={b.title}
              busy={openingKey === b.groupKey}
            />
          </Pressable>
        ))}
      </ScrollView>

      {viewer ? (
        <FeedEventViewer events={viewer.events} mode={viewer.mode} onClose={closeViewer} />
      ) : null}
    </View>
  );
}
