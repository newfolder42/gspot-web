import { useState } from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { usersApi } from '@/lib/users';

type Props = {
  alias: string;
  initialFollowing: boolean;
  /** Compact pill used inside connection rows. */
  size?: 'default' | 'sm';
};

/** Follow / unfollow toggle with optimistic UI, mirroring web `components/account/follow-button`. */
export function FollowButton({ alias, initialFollowing, size = 'default' }: Props) {
  const queryClient = useQueryClient();
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (loading) return;
    const next = !following;
    setFollowing(next);
    setLoading(true);
    try {
      if (next) {
        await usersApi.followUser(alias);
      } else {
        await usersApi.unfollowUser(alias);
      }
      queryClient.invalidateQueries({ queryKey: ['user-profile', alias] });
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    } catch {
      setFollowing(!next); // revert on failure
    } finally {
      setLoading(false);
    }
  }

  const compact = size === 'sm';
  const padding = compact ? 'px-3 py-1.5' : 'px-4 py-2';
  const textSize = compact ? 'text-xs' : 'text-sm';

  return (
    <Pressable
      onPress={toggle}
      disabled={loading}
      className={`flex-row items-center gap-1.5 rounded-full ${padding} ${
        following
          ? 'bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700'
          : 'bg-teal-600'
      } ${loading ? 'opacity-60' : ''}`}
    >
      {loading ? (
        <ActivityIndicator size="small" color={following ? '#71717A' : '#ffffff'} />
      ) : (
        <>
          <Feather
            name={following ? 'user-check' : 'user-plus'}
            size={compact ? 13 : 15}
            color={following ? '#71717A' : '#ffffff'}
          />
          <Text
            className={`${textSize} font-semibold ${
              following ? 'text-zinc-700 dark:text-zinc-300' : 'text-white'
            }`}
          >
            {following ? 'გამოწერილია' : 'გამოწერა'}
          </Text>
        </>
      )}
    </Pressable>
  );
}
