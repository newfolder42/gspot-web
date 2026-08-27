import { Text, View } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

type Props = {
  voteScore?: number | null;
  /** gps posts only; omitted for quest completions, matching web. */
  guessCount?: number | null;
  commentCount: number;
  /** 'sm' is the compact grid-tile variant of the web badge. */
  size?: 'default' | 'sm';
  className?: string;
};

/**
 * Mirrors web `common/post-stats-badge`: pill with vote score, guesses (gps
 * posts only) and comment count over the post image. Shared by the feed cards
 * and the profile post grid.
 */
export function PostStatsBadge({
  voteScore,
  guessCount,
  commentCount,
  size = 'default',
  className = 'absolute top-3 right-3',
}: Props) {
  const compact = size === 'sm';
  const iconSize = compact ? 12 : 16;
  const textClass = compact ? 'text-xs font-semibold text-zinc-50' : 'text-sm font-semibold text-zinc-50';
  const padding = compact ? 'px-1.5 py-0.5' : 'px-2.5 py-1';
  const gapClass = compact ? 'ml-1' : 'ml-2';

  return (
    <View
      className={`${className} flex-row items-center gap-1.5 rounded-full ${padding} border border-white/20`}
      style={{ backgroundColor: 'rgba(24,24,27,0.8)' }}
    >
      {voteScore != null ? (
        <View className="flex-row items-center gap-1">
          <MaterialCommunityIcons name="arrow-up-bold" size={iconSize} color={Colors.onImage} />
          <Text className={textClass}>{voteScore}</Text>
        </View>
      ) : null}
      {guessCount != null ? (
        <View className={`flex-row items-center gap-1 ${voteScore != null ? gapClass : ''}`}>
          <Feather name="map-pin" size={iconSize} color={Colors.onImage} />
          <Text className={textClass}>{guessCount}</Text>
        </View>
      ) : null}
      <View className={`flex-row items-center gap-1 ${voteScore != null || guessCount != null ? gapClass : ''}`}>
        <Feather name="message-circle" size={iconSize} color={Colors.onImage} />
        <Text className={textClass}>{commentCount}</Text>
      </View>
    </View>
  );
}
