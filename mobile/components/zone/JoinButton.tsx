import { useState } from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { zonesApi, type ZoneMembershipStatus, type ZoneMemberRole } from '@/lib/zones';

type Props = {
  slug: string;
  status: ZoneMembershipStatus | null;
  role: ZoneMemberRole | null;
  joinPolicy: string;
};

/** Join / request / leave control, mirroring web `become-zone-member-button`. */
export function JoinButton({ slug, status, role, joinPolicy }: Props) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const isMember = status === 'active';
  const isPending = status === 'pending';
  const isJoined = isMember || isPending;
  const canSelfJoin = joinPolicy !== 'invite_only';

  if (status === 'banned') return null;
  if (role === 'owner') return null;
  if (!isJoined && !canSelfJoin) return null;

  async function handlePress() {
    if (loading) return;
    setLoading(true);
    try {
      if (isJoined) await zonesApi.leave(slug);
      else await zonesApi.join(slug);
      await queryClient.invalidateQueries({ queryKey: ['zone-meta', slug] });
      await queryClient.invalidateQueries({ queryKey: ['zone-members', slug] });
    } catch {
      // surfaced by refetch state; keep silent for parity with web
    } finally {
      setLoading(false);
    }
  }

  const label = isMember
    ? 'წევრი'
    : isPending
      ? 'მოლოდინში'
      : joinPolicy === 'request'
        ? 'გაწევრიანების მოთხოვნა'
        : 'გაწევრიანება';

  return (
    <Pressable
      onPress={handlePress}
      disabled={loading}
      className={`flex-row items-center justify-center gap-1.5 rounded-md px-3 py-1.5 border ${
        isJoined
          ? 'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700'
          : 'bg-teal-600 border-teal-600'
      } ${loading ? 'opacity-60' : ''}`}
    >
      {loading ? (
        <ActivityIndicator size="small" color={isJoined ? '#71717A' : '#ffffff'} />
      ) : (
        <Text className={`text-sm font-medium ${isJoined ? 'text-zinc-700 dark:text-zinc-300' : 'text-white'}`}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
