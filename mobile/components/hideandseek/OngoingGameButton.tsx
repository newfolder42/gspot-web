import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { useCountdown } from '@/components/hideandseek/useCountdown';
import { hideAndSeekApi } from '@/lib/hideAndSeek';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/colors';

/** Matches the web button; a game's state changes slowly enough for a minute. */
const POLL_MS = 60_000;

/**
 * Floating badge for the one game the user is in. Only one can ever be active per user,
 * which is why this is a single row and not a list.
 */
export function OngoingGameButton({ bottomOffset = 90 }: { bottomOffset?: number }) {
  const router = useRouter();
  const { user } = useAuth();

  const { data: game, refetch } = useQuery({
    queryKey: ['hide-and-seek', 'active'],
    queryFn: () => hideAndSeekApi.getActive(),
    refetchInterval: POLL_MS,
    enabled: !!user,
  });

  const { label, expired } = useCountdown(game?.endsAt, () => refetch());

  if (!game || expired) return null;

  return (
    <View style={{ position: 'absolute', right: 16, bottom: bottomOffset, zIndex: 40 }}>
      <Pressable
        onPress={() => router.push({ pathname: '/(app)/post/[id]', params: { id: String(game.postId) } })}
        className="flex-row items-center gap-2.5 rounded-full pl-3 pr-4 py-2.5"
        style={{
          backgroundColor: Colors.brand,
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        }}
      >
        <Feather name="eye" size={18} color={Colors.onAccent} />
        <View>
          <Text className="text-xs font-bold" style={{ color: Colors.onAccent }} numberOfLines={1}>
            {game.role === 'host' ? 'შენ იმალები' : `ეძებ ${game.hostAlias}`}
          </Text>
          <Text className="text-sm font-bold" style={{ color: Colors.onAccent }}>{label}</Text>
        </View>
        {game.role === 'seeker' && (
          <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>
            <Text className="text-xs font-bold" style={{ color: Colors.onAccent }}>{game.checksRemaining}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}
