import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ProgressiveImage } from '@/components/ui/ProgressiveImage';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { PostPhoto } from '@/components/ui/PostPhoto';
import { LevelBadge } from '@/components/ui/LevelBadge';
import { TagBadge } from '@/components/ui/TagBadge';
import { PostActionBar } from '@/components/PostActionBar';
import type { MobilePostType } from '@/types/post';

function formatTimeAgo(timestamp: string): string {
  const date = new Date(timestamp);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(diffMs / 86_400_000);

  if (minutes < 1) return 'ახლახანს';
  if (minutes < 60) return `${minutes} წუთის წინ`;
  if (hours < 24) return `${hours} საათის წინ`;
  return `${days} დღის წინ`;
}

/** Mirrors web QuestCompletionTitle */
function questCompletionTitle(questTitle: string | null | undefined): string {
  return questTitle ? `შეასრულა მისია ${questTitle}` : 'შეასრულა მისია';
}

/**
 * Shared feed card – used by the global, to-guess and zone feeds. The zone feed
 * passes `showZone={false}`, as web GpsPost does.
 */
export function FeedPostCard({ item, showZone = true }: { item: MobilePostType; showZone?: boolean }) {
  const router = useRouter();
  const isQuest = item.type === 'quest-completion';
  const photos = item.photos ?? [];
  const openPost = () => router.push({ pathname: '/(app)/post/[id]', params: { id: String(item.id) } });

  return (
    <View className="mb-4">
      {/* ── Metadata header – mirrors web <article> p-2 block ── */}
      <View className="p-2">
        <View className="flex-row items-center gap-1.5 flex-wrap">
          {/* Zone avatar + slug – tappable → zone feed */}
          {showZone ? (
            <>
              <Pressable
                className="flex-row items-center gap-1.5"
                onPress={() => router.push({ pathname: '/(app)/zone/[slug]', params: { slug: item.zoneSlug ?? '' } })}
              >
                <ProfileAvatar name={item.zoneSlug ?? ''} photoUrl={item.zoneProfilePhoto} size={24} shape="md" />
                <Text className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{item.zoneSlug}</Text>
              </Pressable>
              <Text className="text-xs text-zinc-500 dark:text-zinc-400">•</Text>
            </>
          ) : null}
          {/* Author + level badge – tappable → user profile */}
          <Pressable
            className="flex-row items-center gap-1"
            onPress={() => router.push({ pathname: '/(app)/user/[alias]', params: { alias: item.author } })}
          >
            <Text className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">&apos;{item.author}</Text>
            {item.authorLevel != null ? <LevelBadge level={item.authorLevel} /> : null}
          </Pressable>
          <Text className="text-xs text-zinc-500 dark:text-zinc-400">•</Text>
          <Text className="text-xs text-zinc-500 dark:text-zinc-400">{formatTimeAgo(item.date)}</Text>
          {/* Failed dot */}
          {item.status === 'failed' ? (
            <View className="w-3 h-3 rounded-full bg-rose-600" />
          ) : null}
        </View>

        {isQuest ? (
          /* Quest title – teal link → zone quest detail */
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/(app)/zone/[slug]/quests/[questId]',
                params: { slug: item.zoneSlug ?? '', questId: String(item.questId ?? '') },
              })
            }
          >
            <Text className="mt-1.5 text-sm font-semibold text-teal-600 dark:text-teal-400">
              {questCompletionTitle(item.questTitle)}
            </Text>
          </Pressable>
        ) : (
          <>
            {/* Tag – solid colour, white text */}
            {item.tag ? <TagBadge name={item.tag.name} color={item.tag.color} /> : null}
            {/* Title */}
            {item.title ? (
              <Text className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{item.title}</Text>
            ) : null}
          </>
        )}
      </View>

      {/* ── Media block ── */}
      {isQuest ? (
        photos.length > 0 ? (
          <Pressable onPress={openPost}>
            <View className="flex-row flex-wrap">
              {photos.map((photo, idx) => (
                <View
                  key={idx}
                  style={{ width: photos.length === 1 ? '100%' : '50%', aspectRatio: 1, padding: 1 }}
                >
                  <View className="flex-1 relative bg-zinc-100 dark:bg-zinc-900">
                    <ProgressiveImage
                      uri={photo.variants?.feed ?? photo.url}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                    {photo.objectiveTitle ? (
                      <View className="absolute bottom-0 inset-x-0 px-2 pt-4 pb-1.5" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
                        <Text className="text-xs font-medium text-white" numberOfLines={1}>{photo.objectiveTitle}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          </Pressable>
        ) : null
      ) : (
        <PostPhoto
          uri={item.imageVariants?.feed ?? item.image}
          dateTaken={item.dateTaken}
          onPress={openPost}
        />
      )}

      {/* ── Votes, rewards, guesses, comments – same row as the post page ── */}
      <PostActionBar
        postId={item.id}
        voteScore={item.voteScore ?? 0}
        userVote={item.userVote ?? null}
        rewards={item.rewards ?? []}
        userReward={item.userReward ?? null}
        guessCount={isQuest ? null : (item.guessCount ?? 0)}
        commentCount={item.commentCount ?? 0}
        onOpenPost={openPost}
        className="px-4 pt-3"
      />
    </View>
  );
}
