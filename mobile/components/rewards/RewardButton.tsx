import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { RewardIcon } from '@/components/rewards/RewardIcon';
import { RewardSheet } from '@/components/rewards/RewardSheet';
import { RewardDetailsModal } from '@/components/rewards/RewardDetailsModal';
import type { RewardCountType, RewardSummaryType, RewardTarget } from '@/types/reward';
import { useTheme } from '@/constants/colors';

type Props = {
  postId: number;
  commentId?: number | null;
  target: RewardTarget;
  rewards?: RewardCountType[];
  userReward?: string | null;
  size?: 'md' | 'sm';
  /** Lets the parent keep its own cache in sync after a reward is given. */
  onChange?: (summary: RewardSummaryType) => void;
};

/**
 * Mirrors web RewardButton: a chip showing the most-given reward + total count
 * (tap → who gave what), and a dashed gift button to give one — hidden once the
 * user has rewarded this target, since rewards are one-shot with no undo.
 */
export function RewardButton({
  postId,
  commentId = null,
  target,
  rewards = [],
  userReward = null,
  size = 'md',
  onChange,
}: Props) {
  const [summary, setSummary] = useState<RewardSummaryType>({ rewards, userReward });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const theme = useTheme();

  const given = summary.rewards.filter((r) => r.count > 0);
  const topReward = given.length > 0 ? given.reduce((a, b) => (b.count > a.count ? b : a)) : null;
  const totalCount = given.reduce((sum, r) => sum + r.count, 0);

  const sm = size === 'sm';
  const iconSize = sm ? 14 : 16;
  const chipHeight = sm ? 24 : 30;

  const handleGiven = (next: RewardSummaryType) => {
    setSummary(next);
    onChange?.(next);
  };

  return (
    <View className="flex-row items-center gap-1.5">
      {topReward ? (
        <Pressable
          onPress={() => setDetailsOpen(true)}
          hitSlop={4}
          className="flex-row items-center gap-1 rounded-full px-1.5"
          style={{ height: chipHeight }}
        >
          <RewardIcon iconUrl={topReward.iconUrl} size={iconSize} />
          <Text className={`font-semibold text-zinc-700 dark:text-zinc-200 ${sm ? 'text-xs' : 'text-sm'}`}>
            {totalCount}
          </Text>
        </Pressable>
      ) : null}

      {!summary.userReward ? (
        <Pressable
          onPress={() => setSheetOpen(true)}
          hitSlop={4}
          className="items-center justify-center rounded-full border border-dashed border-zinc-300 dark:border-zinc-600"
          style={{ height: chipHeight, width: chipHeight }}
        >
          <Feather name="gift" size={iconSize} color={theme.icon} />
        </Pressable>
      ) : null}

      {sheetOpen ? (
        <RewardSheet
          postId={postId}
          commentId={commentId}
          target={target}
          onClose={() => setSheetOpen(false)}
          onGiven={handleGiven}
        />
      ) : null}

      {detailsOpen ? (
        <RewardDetailsModal
          postId={postId}
          commentId={commentId}
          onClose={() => setDetailsOpen(false)}
        />
      ) : null}
    </View>
  );
}
