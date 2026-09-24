import { Pressable, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { VoteButtons } from '@/components/votes/VoteButtons';
import { RewardButton } from '@/components/rewards/RewardButton';
import { ShareButton } from '@/components/ui/ShareButton';
import { syncPostInCaches } from '@/lib/postCache';
import type { RewardCountType } from '@/types/reward';
import type { VoteValue } from '@/types/vote';
import { useTheme } from '@/constants/colors';

type Props = {
  postId: number;
  voteScore: number;
  userVote: VoteValue | null;
  rewards: RewardCountType[];
  userReward: string | null;
  /** gps posts only; leave out for quest completions and hide-and-seek, matching web. */
  guessCount?: number | null;
  commentCount: number;
  /** Feed cards open the post from the counts; the post page leaves them inert. */
  onOpenPost?: () => void;
  className?: string;
};

/**
 * Votes, rewards, guesses and comments for a post — the same row on the post page
 * and the feed cards. Mirrors web `post-action-bar`.
 */
export function PostActionBar({
  postId,
  voteScore,
  userVote,
  rewards,
  userReward,
  guessCount,
  commentCount,
  onOpenPost,
  className = '',
}: Props) {
  const theme = useTheme();
  const queryClient = useQueryClient();

  const stats = (
    <>
      {guessCount != null ? (
        <View className="flex-row items-center gap-1">
          <Feather name="map-pin" size={15} color={theme.icon} />
          <Text className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">{guessCount}</Text>
        </View>
      ) : null}
      <View className="flex-row items-center gap-1">
        <Feather name="message-circle" size={15} color={theme.icon} />
        <Text className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">{commentCount}</Text>
      </View>
    </>
  );

  return (
    <View className={`flex-row items-center gap-2 ${className}`}>
      <VoteButtons
        postId={postId}
        score={voteScore}
        userVote={userVote}
        onChange={(next) => syncPostInCaches(queryClient, postId, { voteScore: next.score, userVote: next.userVote })}
      />
      <RewardButton
        postId={postId}
        target="post"
        rewards={rewards}
        userReward={userReward}
        onChange={(next) => syncPostInCaches(queryClient, postId, { rewards: next.rewards, userReward: next.userReward })}
      />
      {onOpenPost ? (
        <Pressable onPress={onOpenPost} hitSlop={6} className="flex-row items-center gap-2 ml-auto">
          {stats}
        </Pressable>
      ) : (
        <View className="flex-row items-center gap-2 ml-auto">{stats}</View>
      )}
      <ShareButton path={`/post/${postId}`} size={15} className="ml-1" />
    </View>
  );
}
