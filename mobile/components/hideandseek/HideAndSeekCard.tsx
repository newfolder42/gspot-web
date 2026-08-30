import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { LevelBadge } from '@/components/ui/LevelBadge';
import { useCountdown } from '@/components/hideandseek/useCountdown';
import { Colors, useTheme } from '@/constants/colors';
import type { MobilePostType } from '@/types/post';

function formatTimeAgo(timestamp: string): string {
  const date = new Date(timestamp);
  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return 'ახლახანს';
  if (minutes < 60) return `${minutes} წუთის წინ`;
  if (hours < 24) return `${hours} საათის წინ`;
  return `${days} დღის წინ`;
}

/** Feed card for a დამალობანა post — no photo, so it leads with the clock. */
export function HideAndSeekCard({ item }: { item: MobilePostType }) {
  const router = useRouter();
  const theme = useTheme();
  const { label, expired } = useCountdown(item.endsAt);
  const live = item.gameStatus === 'active' && !expired;

  // A live game keeps the teal ground; a finished one drops to plain white/black.
  const surfaceColor = live ? '#0F766E' : theme.scheme === 'dark' ? '#000000' : '#FFFFFF';
  const headingColor = live ? Colors.onAccent : theme.text;
  const mutedColor = live ? Colors.onImageMuted : theme.textMuted;

  return (
    <View className="mb-4">
      <View className="p-2">
        <View className="flex-row items-center gap-1.5 flex-wrap">
          <Pressable
            className="flex-row items-center gap-1.5"
            onPress={() => router.push({ pathname: '/(app)/zone/[slug]', params: { slug: item.zoneSlug ?? '' } })}
          >
            <ProfileAvatar name={item.zoneSlug ?? ''} photoUrl={item.zoneProfilePhoto} size={24} shape="md" />
            <Text className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{item.zoneSlug}</Text>
          </Pressable>
          <Text className="text-xs text-zinc-400">•</Text>
          <Pressable
            className="flex-row items-center gap-1"
            onPress={() => router.push({ pathname: '/(app)/user/[alias]', params: { alias: item.author } })}
          >
            <Text className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{item.author}</Text>
            {item.authorLevel != null && <LevelBadge level={item.authorLevel} />}
          </Pressable>
          <Text className="text-xs text-zinc-400">•</Text>
          <Text className="text-xs text-zinc-400">{formatTimeAgo(item.date)}</Text>
          {item.visibility === 'private' && (
            <Feather name="lock" size={12} color="#A1A1AA" />
          )}
        </View>
      </View>

      <Pressable onPress={() => router.push({ pathname: '/(app)/post/[id]', params: { id: String(item.id) } })}>
        <View
          className="rounded-lg overflow-hidden px-4 py-8 items-center gap-3"
          style={{
            backgroundColor: surfaceColor,
            borderWidth: live ? 0 : 1,
            borderColor: theme.border,
          }}
        >
          <View
            className="flex-row items-center gap-1.5 rounded-full px-2.5 py-1"
            style={{ backgroundColor: live ? 'rgba(0,0,0,0.25)' : theme.surfaceAlt }}
          >
            <Feather name="eye" size={14} color={mutedColor} />
            <Text className="text-xs font-bold uppercase" style={{ color: mutedColor }}>დამალობანა</Text>
          </View>

          <Text className="text-lg font-bold text-center" style={{ color: headingColor }}>{item.title}</Text>

          <View
            className="rounded-full px-2.5 py-1"
            style={{ backgroundColor: live ? 'rgba(255,255,255,0.2)' : theme.surfaceAlt }}
          >
            <Text className="text-xs font-bold" style={{ color: live ? Colors.onAccent : mutedColor }}>
              {live ? label : 'დასრულდა'}
            </Text>
          </View>

          {item.viewerRole && (
            <Text className="text-xs font-medium" style={{ color: mutedColor }}>
              {item.viewerRole === 'host' ? 'შენ იმალები' : 'შენ ეძებ'}
            </Text>
          )}
        </View>
      </Pressable>

      <View className="flex-row items-center gap-4 px-2 py-2">
        <View className="flex-row items-center gap-1">
          <Feather name="users" size={14} color="#71717A" />
          <Text className="text-sm text-zinc-500">{item.playerCount ?? 0}</Text>
        </View>
        <View className="flex-row items-center gap-1">
          <Feather name="check-circle" size={14} color="#71717A" />
          <Text className="text-sm text-zinc-500">{item.foundCount ?? 0}</Text>
        </View>
        <View className="flex-row items-center gap-1">
          <Feather name="message-square" size={14} color="#71717A" />
          <Text className="text-sm text-zinc-500">{item.commentCount ?? 0}</Text>
        </View>
      </View>
    </View>
  );
}
