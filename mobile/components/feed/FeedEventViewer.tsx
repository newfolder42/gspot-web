import { useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { CharacterLink } from '@/components/ui/CharacterLink';
import { LevelBadge } from '@/components/ui/LevelBadge';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { RemoteImage } from '@/components/ui/RemoteImage';
import { FeedEventViewersModal } from '@/components/feed/FeedEventViewersModal';
import { feedEventsApi } from '@/lib/feedEvents';
import { formatTimePassed } from '@/lib/dates';
import { useTheme } from '@/constants/colors';
import type {
  AchievementUnlockedDetails,
  FeedEvent,
  OwnFeedEvent,
  QuestCompletedDetails,
  QuestCreatedDetails,
} from '@/types/feed-event';

const MAX_CARD_WIDTH = 480;
/** Air kept above and below the card. */
const VIEWER_MARGIN = 16;
/** The progress segments above the card (2dp bar + 8dp gap). */
const PROGRESS_HEIGHT = 10;
/** The media never gets shorter than this, however short the window. */
const MIN_MEDIA_HEIGHT = 120;
/**
 * What a slide spends on everything except its media: progress segments, header,
 * the quest-title row and the reaction row. Hand-measured; the card scrolls if a
 * long title makes it a little more.
 */
function slideChrome(type: Slide['type'] | undefined): number {
  if (type === 'quest_completed') return 147;
  if (type === 'quest_created') return 111;
  return 105;
}

/**
 * What a slide needs to size its media. Upright the media is the full-width
 * square it always was (`capped` false); in a short window the square no longer
 * fits, so `height` is what is left for it and the artwork inside shrinks to match.
 */
type MediaSize = { capped: boolean; height: number };

/**
 * Illustration size for the centred achievement / new-quest panels: 160 upright,
 * otherwise whatever the panel is left with after `reserve` for its text.
 */
function artSize({ capped, height }: MediaSize, reserve: number): number {
  return capped ? Math.max(56, Math.min(160, height - reserve)) : 160;
}

type Slide = FeedEvent | OwnFeedEvent;

type Props = {
  events: Slide[];
  mode: 'others' | 'own';
  initialIndex?: number;
  onClose: () => void;
};

/** New quests speak as their character (or the zone), not the user who created them. */
function SlideActor({ event, onNavigate }: { event: Slide; onNavigate?: (path: any, params?: any) => void }) {
  if (event.type === 'quest_created') {
    const d = event.details as QuestCreatedDetails;
    return (
      <CharacterLink
        name={d.characterName ?? d.zoneName}
        zoneSlug={d.zoneSlug}
        characterSlug={d.characterName ? d.characterSlug : null}
        onNavigate={onNavigate}
      />
    );
  }
  return (
    <>
      <Text className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
        &apos;{event.actorAlias}
      </Text>
      {event.actorLevel != null ? <LevelBadge level={event.actorLevel} /> : null}
    </>
  );
}

function SlideHeader({
  event,
  icon,
  onNavigate,
}: {
  event: Slide;
  icon: React.ReactNode;
  onNavigate?: (path: any, params?: any) => void;
}) {
  return (
    <View className="flex-row items-center gap-2 px-4 py-3">
      <View>{icon}</View>
      <SlideActor event={event} onNavigate={onNavigate} />
      <Text className="text-xs text-zinc-500 dark:text-zinc-400">•</Text>
      <Text className="text-xs text-zinc-500 dark:text-zinc-400">{formatTimePassed(event.createdAt)}</Text>
    </View>
  );
}

function QuestSlide({
  event,
  media,
  onNavigate,
}: {
  event: Slide;
  media: MediaSize;
  onNavigate: (path: any, params?: any) => void;
}) {
  const d = event.details as QuestCompletedDetails;
  const photos = d.photos ?? [];
  // Upright the tiles are squares (100% / 50% wide). When capped, the grid has to
  // fit `media.height` in total: one row up to two photos, then more columns.
  const columns = photos.length <= 1 ? 1 : photos.length <= 4 ? 2 : 3;
  const tile = media.capped
    ? { width: `${100 / columns}%` as const, height: media.height / Math.ceil(photos.length / columns), padding: 1 }
    : { width: photos.length === 1 ? ('100%' as const) : ('50%' as const), aspectRatio: 1, padding: 1 };

  return (
    <View>
      <SlideHeader
        event={event}
        icon={<ProfileAvatar name={d.questTitle} photoUrl={d.characterAvatar} size={32} shape="full" />}
      />
      <Pressable
        onPress={() =>
          onNavigate('/(app)/zone/[slug]/quests/[questId]', {
            slug: d.zoneSlug,
            questId: String(d.questId),
          })
        }
        className="px-4 pb-3 flex-row items-center gap-1.5"
      >
        <Feather name="flag" size={15} color="#D97706" />
        <Text className="text-base font-semibold text-amber-600 dark:text-amber-400 flex-1">
          შეასრულა მისია "{d.questTitle}"
        </Text>
      </Pressable>

      {photos.length > 0 ? (
        <View className="flex-row flex-wrap">
          {photos.map((photo, idx) => (
            <Pressable
              key={idx}
              disabled={d.postId == null}
              onPress={() => d.postId && onNavigate('/(app)/post/[id]', { id: String(d.postId) })}
              style={tile}
            >
              <View className="flex-1 bg-zinc-100 dark:bg-zinc-800">
                <Image
                  source={{ uri: photo.feed ?? photo.url }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
                {photo.objectiveTitle ? (
                  <View
                    className="absolute bottom-0 inset-x-0 px-2 pt-4 pb-1.5"
                    style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
                  >
                    <Text className="text-xs font-medium text-white" numberOfLines={1}>
                      {photo.objectiveTitle}
                    </Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          ))}
        </View>
      ) : (
        <Pressable
          disabled={d.postId == null}
          onPress={() => d.postId && onNavigate('/(app)/post/[id]', { id: String(d.postId) })}
          className="items-center justify-center bg-amber-500"
          style={media.capped ? { height: media.height } : { aspectRatio: 1 }}
        >
          <Feather name="flag" size={media.capped ? 48 : 64} color="rgba(255,255,255,0.9)" />
        </Pressable>
      )}
    </View>
  );
}

function AchievementSlide({ event, media }: { event: Slide; media: MediaSize }) {
  const d = event.details as AchievementUnlockedDetails;
  const title = d.milestoneName || d.achievementName;
  const art = artSize(media, 110);

  return (
    <View>
      <SlideHeader event={event} icon={<Feather name="award" size={26} color="#FBBF24" />} />
      <View
        className="items-center justify-center gap-5 px-6 bg-zinc-100 dark:bg-zinc-800"
        style={media.capped ? { height: media.height } : { aspectRatio: 1 }}
      >
        {d.imageUrl ? (
          <RemoteImage uri={d.imageUrl} style={{ width: art, height: art }} resizeMode="contain" />
        ) : (
          <Feather name="award" size={media.capped ? Math.round(art * 0.7) : 112} color="#FBBF24" />
        )}
        <View className="items-center">
          <Text className="text-sm uppercase tracking-wide text-amber-600 dark:text-amber-300 mb-1">
            მიღწევა
          </Text>
          <Text className="text-xl font-bold text-zinc-900 dark:text-white text-center">{title}</Text>
        </View>
      </View>
    </View>
  );
}

function QuestCreatedSlide({
  event,
  media,
  onNavigate,
}: {
  event: Slide;
  media: MediaSize;
  onNavigate: (path: any, params?: any) => void;
}) {
  const d = event.details as QuestCreatedDetails;
  // Label, title and zone name sit under the picture here, so it keeps less of the panel.
  const art = artSize(media, 140);

  return (
    <View>
      <SlideHeader
        event={event}
        onNavigate={onNavigate}
        icon={
          <ProfileAvatar name={d.characterName ?? d.questTitle} photoUrl={d.characterAvatar} size={32} shape="full" />
        }
      />
      <Pressable
        onPress={() =>
          onNavigate('/(app)/zone/[slug]/quests/[questId]', {
            slug: d.zoneSlug,
            questId: String(d.questId),
          })
        }
        className="items-center justify-center gap-5 px-6 bg-zinc-100 dark:bg-zinc-800"
        style={media.capped ? { height: media.height } : { aspectRatio: 1 }}
      >
        {d.characterAvatar ? (
          <RemoteImage
            uri={d.characterAvatar}
            style={{ width: art, height: art, borderRadius: art / 2 }}
            resizeMode="cover"
          />
        ) : (
          <Feather name="flag" size={media.capped ? Math.round(art * 0.7) : 112} color="#FBBF24" />
        )}
        <View className="items-center">
          <Text className="text-sm uppercase tracking-wide text-amber-600 dark:text-amber-300 mb-1">
            ახალი მისია
          </Text>
          <Text className="text-xl font-bold text-zinc-900 dark:text-white text-center">{d.questTitle}</Text>
          <Text className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{d.zoneName}</Text>
        </View>
      </Pressable>
    </View>
  );
}

/**
 * Scrolls the card when the window is too short to show all of it (landscape).
 * Upright it renders the card untouched.
 */
function CardScroller({
  enabled,
  maxHeight,
  children,
}: {
  enabled: boolean;
  maxHeight: number;
  children: React.ReactNode;
}) {
  if (!enabled) return <>{children}</>;
  return (
    <ScrollView style={{ maxHeight }} bounces={false} showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  );
}

/**
 * Story-style viewer — mirrors web FeedEventViewer. Tap the left/right third of
 * the slide to page (the mobile equivalent of the web's arrow buttons); others'
 * events are marked seen as they surface.
 */
export function FeedEventViewer({ events, mode, initialIndex = 0, onClose }: Props) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [index, setIndex] = useState(initialIndex);
  const [viewersFor, setViewersFor] = useState<number | null>(null);
  // ids reacted to in this session — the slide objects are mutated too, this
  // set is what actually re-renders the button
  const [reactedIds, setReactedIds] = useState<Set<number>>(new Set());
  const [reacting, setReacting] = useState(false);

  const current = events[index];
  const count = events.length;

  // The card is a full-width square of media plus a header and a reaction row —
  // taller than a landscape window. When it does not fit, the media takes the
  // height that is left (and the card scrolls if a long title costs more).
  const cardWidth = Math.min(windowWidth - insets.left - insets.right, MAX_CARD_WIDTH);
  const roomForCard = windowHeight - insets.top - insets.bottom - VIEWER_MARGIN * 2;
  const mediaRoom = roomForCard - slideChrome(current?.type);
  const media: MediaSize = {
    capped: mediaRoom < cardWidth,
    height: Math.max(MIN_MEDIA_HEIGHT, Math.min(cardWidth, mediaRoom)),
  };

  const goNext = () => setIndex((i) => (i < count - 1 ? i + 1 : i));
  const goPrev = () => setIndex((i) => (i > 0 ? i - 1 : i));

  // Mark others' events seen as they surface.
  useEffect(() => {
    if (mode === 'others' && current && !current.seen) {
      current.seen = true;
      feedEventsApi.markSeen(current.id).catch(() => {});
    }
  }, [current, mode]);

  const hasReacted = !!current && (current.reacted || reactedIds.has(current.id));

  const react = async () => {
    if (!current || reacting || hasReacted) return;
    setReacting(true);
    try {
      const res = await feedEventsApi.react(current.id);
      if (res.reacted) {
        current.reacted = true;
        setReactedIds((prev) => new Set(prev).add(current.id));
      }
    } catch {
      // a failed reaction just leaves the button as it was
    } finally {
      setReacting(false);
    }
  };

  const navigate = (path: any, params?: any) => {
    onClose();
    router.push(params ? { pathname: path, params } : path);
  };

  if (!current) return null;

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.85)',
          paddingLeft: insets.left,
          paddingRight: insets.right,
        }}
        className="items-center justify-center"
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{ width: cardWidth }}
        >
          {/* Progress segments */}
          <View className="flex-row gap-1 px-3 pb-2">
            {events.map((_, i) => (
              <View key={i} className="h-0.5 flex-1 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.3)' }}>
                <View style={{ height: '100%', backgroundColor: '#fff', width: i <= index ? '100%' : '0%' }} />
              </View>
            ))}
          </View>

          <CardScroller enabled={media.capped} maxHeight={roomForCard - PROGRESS_HEIGHT}>
            <View className="rounded-2xl overflow-hidden bg-white dark:bg-zinc-900">
              {/* Close */}
              <Pressable onPress={onClose} hitSlop={10} className="absolute top-3 right-3 z-10 p-1">
                <Feather name="x" size={20} color={theme.icon} />
              </Pressable>

              {current.type === 'quest_completed' ? (
                <QuestSlide event={current} media={media} onNavigate={navigate} />
              ) : current.type === 'quest_created' ? (
                <QuestCreatedSlide event={current} media={media} onNavigate={navigate} />
              ) : (
                <AchievementSlide event={current} media={media} />
              )}

              {mode === 'own' ? (
                <Pressable
                  onPress={() => setViewersFor(current.id)}
                  className="flex-row items-center justify-center gap-4 py-3 border-t border-zinc-200 dark:border-zinc-800"
                >
                  <View className="flex-row items-center gap-1.5">
                    <Feather name="eye" size={15} color={theme.icon} />
                    <Text className="text-sm text-zinc-500 dark:text-zinc-400">
                      ნანახია {(current as OwnFeedEvent).seenCount}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-1.5">
                    <MaterialCommunityIcons name="arrow-up-bold" size={16} color={theme.icon} />
                    <Text className="text-sm text-zinc-500 dark:text-zinc-400">
                      {(current as OwnFeedEvent).reactionCount}
                    </Text>
                  </View>
                </Pressable>
              ) : (
                <Pressable
                  onPress={react}
                  disabled={hasReacted || reacting}
                  className="flex-row items-center justify-center gap-1.5 py-3 border-t border-zinc-200 dark:border-zinc-800"
                >
                  <MaterialCommunityIcons
                    name="arrow-up-bold"
                    size={16}
                    color={hasReacted ? '#14B8A6' : theme.icon}
                  />
                  <Text
                    className={
                      hasReacted
                        ? 'text-sm text-teal-600 dark:text-teal-400'
                        : 'text-sm text-zinc-500 dark:text-zinc-400'
                    }
                  >
                    {hasReacted ? 'მოწონებული' : 'მომწონს'}
                  </Text>
                </Pressable>
              )}
            </View>
          </CardScroller>

          {/* Paging taps – left third back, right third forward. Sits above the
              slide but below the interactive header/CTA rows above. */}
          {count > 1 ? (
            <View
              pointerEvents="box-none"
              style={{ position: 'absolute', top: 56, bottom: 56, left: 0, right: 0, flexDirection: 'row' }}
            >
              <Pressable style={{ width: '25%' }} onPress={goPrev} disabled={index === 0} />
              <View style={{ flex: 1 }} pointerEvents="none" />
              <Pressable style={{ width: '25%' }} onPress={goNext} disabled={index === count - 1} />
            </View>
          ) : null}
        </Pressable>
      </Pressable>

      {viewersFor != null ? (
        <FeedEventViewersModal eventId={viewersFor} onClose={() => setViewersFor(null)} />
      ) : null}
    </Modal>
  );
}
