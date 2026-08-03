import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { votesApi } from '@/lib/votes';
import type { VoteSummaryType, VoteValue } from '@/types/vote';

const TEAL = '#14B8A6';
const ROSE = '#F43F5E';
const ZINC = '#A1A1AA';

type Props = {
  postId: number;
  commentId?: number | null;
  score?: number;
  userVote?: VoteValue | null;
  size?: 'md' | 'sm';
  /** Lets the parent keep its own cache in sync after a successful toggle. */
  onChange?: (summary: VoteSummaryType) => void;
};

/** Mirrors web VoteButtons: up / score / down, teal when upvoted, rose when downvoted. */
export function VoteButtons({
  postId,
  commentId = null,
  score = 0,
  userVote = null,
  size = 'md',
  onChange,
}: Props) {
  const [summary, setSummary] = useState<VoteSummaryType>({ score, userVote });
  const [pending, setPending] = useState(false);

  const handleVote = async (value: VoteValue) => {
    if (pending) return;
    setPending(true);
    // Optimistic: recompute locally, then reconcile with the server's summary.
    const previous = summary;
    const removing = previous.userVote === value;
    setSummary({
      score: previous.score - (previous.userVote ?? 0) + (removing ? 0 : value),
      userVote: removing ? null : value,
    });
    try {
      const next = await votesApi.toggle(postId, commentId, value);
      setSummary(next);
      onChange?.(next);
    } catch {
      setSummary(previous);
    } finally {
      setPending(false);
    }
  };

  const sm = size === 'sm';
  const iconSize = sm ? 15 : 18;
  const upActive = summary.userVote === 1;
  const downActive = summary.userVote === -1;

  return (
    <View className="flex-row items-center gap-1" style={{ opacity: pending ? 0.5 : 1 }}>
      <Pressable onPress={() => handleVote(1)} disabled={pending} hitSlop={6} className="p-0.5">
        <MaterialCommunityIcons name="arrow-up-bold" size={iconSize} color={upActive ? TEAL : ZINC} />
      </Pressable>

      <Text
        className={`font-semibold ${sm ? 'text-xs' : 'text-sm'}`}
        style={{ color: upActive ? TEAL : downActive ? ROSE : '#71717A' }}
      >
        {summary.score}
      </Text>

      <Pressable onPress={() => handleVote(-1)} disabled={pending} hitSlop={6} className="p-0.5">
        <MaterialCommunityIcons name="arrow-down-bold" size={iconSize} color={downActive ? ROSE : ZINC} />
      </Pressable>
    </View>
  );
}
