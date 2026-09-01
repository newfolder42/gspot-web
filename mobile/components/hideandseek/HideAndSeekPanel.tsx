import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LevelBadge } from '@/components/ui/LevelBadge';
import { ChecksMap } from '@/components/hideandseek/ChecksMap';
import { NewCheck } from '@/components/hideandseek/NewCheck';
import { useCountdown } from '@/components/hideandseek/useCountdown';
import { hideAndSeekApi } from '@/lib/hideAndSeek';
import { formatDistance, formatMinutes } from '@/types/hide-and-seek';
import type {
  HideAndSeekCheckResultType,
  HideAndSeekGameType,
  HideAndSeekPlayerType,
} from '@/types/hide-and-seek';
import { Colors, useTheme } from '@/constants/colors';

type Props = {
  game: HideAndSeekGameType;
  players: HideAndSeekPlayerType[];
  currentUserId: number | null;
  onChanged?: () => void;
};

export function HideAndSeekPanel({ game, players, currentUserId, onChanged }: Props) {
  const theme = useTheme();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [locallyExpired, setLocallyExpired] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const { label, expired } = useCountdown(game.endsAt, () => setLocallyExpired(true));

  const isHost = currentUserId != null && currentUserId === game.hostId;
  const viewer = game.viewer;
  // the server is the authority, but the clock drops the UI to "ended" without waiting
  // for the expiry job's next minute
  const live = game.status === 'active' && !expired && !locallyExpired;
  const foundCount = players.filter((p) => p.status === 'found').length;
  const checkCount = players.reduce((total, p) => total + p.checkCount, 0);
  // The board only opens once the game is over — while it runs, where everyone has
  // already looked is precisely what the seekers are spending checks to learn.
  const canSeeMap = isHost && !live && checkCount > 0;

  // Matches the feed card: teal while live, plain white/black once finished.
  const surfaceColor = live ? '#0F766E' : theme.scheme === 'dark' ? '#000000' : '#FFFFFF';
  const headingColor = live ? Colors.onAccent : theme.text;
  const mutedColor = live ? Colors.onImageMuted : theme.textMuted;

  const join = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await hideAndSeekApi.join(game.postId);
      onChanged?.();
    } catch (err) {
      Alert.alert('ვერ ჩაერთე', err instanceof Error ? err.message : 'სცადე თავიდან.');
    } finally {
      setBusy(false);
    }
  };

  const endGame = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await hideAndSeekApi.end(game.postId);
      onChanged?.();
    } catch (err) {
      Alert.alert('ვერ დასრულდა', err instanceof Error ? err.message : 'სცადე თავიდან.');
    } finally {
      setBusy(false);
    }
  };

  const handleChecked = (result: HideAndSeekCheckResultType) => {
    if (result.found) onChanged?.();
  };

  return (
    <View className="rounded-lg overflow-hidden mx-2 mb-2" style={{ borderWidth: 1, borderColor: theme.border }}>
      <View
        className="px-4 py-4 gap-3"
        style={{
          backgroundColor: surfaceColor,
          borderBottomWidth: live ? 0 : 1,
          borderBottomColor: theme.border,
        }}
      >
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <View className="flex-row items-center gap-1.5">
              <Feather name="eye" size={14} color={mutedColor} />
              <Text className="text-xs font-bold uppercase" style={{ color: mutedColor }}>დამალობანა</Text>
              {game.visibility === 'private' && <Feather name="lock" size={12} color={mutedColor} />}
            </View>
            <Text className="mt-1 text-lg font-bold" style={{ color: headingColor }}>{game.title}</Text>
            <Pressable
              className="mt-1 flex-row items-center gap-1"
              onPress={() => router.push({ pathname: '/(app)/user/[alias]', params: { alias: game.hostAlias } })}
            >
              <Text className="text-sm" style={{ color: mutedColor }}>იმალება</Text>
              <Text className="text-sm font-bold" style={{ color: headingColor }}>{game.hostAlias}</Text>
              {game.hostLevel != null && <LevelBadge level={game.hostLevel} />}
            </Pressable>
          </View>

          <View className="items-end">
            {live ? (
              <>
                <Text className="text-2xl font-bold" style={{ color: Colors.onAccent }}>{label}</Text>
                <Text className="text-xs" style={{ color: Colors.onImageMuted }}>დარჩა</Text>
              </>
            ) : (
              <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: theme.surfaceAlt }}>
                <Text className="text-xs font-bold" style={{ color: mutedColor }}>დასრულდა</Text>
              </View>
            )}
          </View>
        </View>

        <View className="flex-row flex-wrap gap-x-4 gap-y-1">
          <Text className="text-xs" style={{ color: mutedColor }}>{players.length} მოთამაშე</Text>
          <Text className="text-xs" style={{ color: mutedColor }}>{foundCount} იპოვა</Text>
          <Text className="text-xs" style={{ color: mutedColor }}>{game.maxChecks} მცდელობა</Text>
          <Text className="text-xs" style={{ color: mutedColor }}>{formatMinutes(game.durationMinutes)}</Text>
          {game.endOnFirstFind && (
            <Text className="text-xs" style={{ color: mutedColor }}>პირველივე პოვნაზე სრულდება</Text>
          )}
        </View>
      </View>

      <View className="p-4 gap-4" style={{ backgroundColor: theme.surface }}>
        {live && !isHost && !viewer && currentUserId != null && (
          <Pressable
            onPress={join}
            disabled={busy}
            className="rounded-md px-4 py-3 items-center flex-row justify-center gap-2"
            style={{ backgroundColor: Colors.brand, opacity: busy ? 0.5 : 1 }}
          >
            {busy && <ActivityIndicator color={Colors.onAccent} size="small" />}
            <Text className="text-sm font-bold" style={{ color: Colors.onAccent }}>ძებნის დაწყება</Text>
          </Pressable>
        )}

        {live && viewer?.role === 'seeker' && viewer.status === 'active' && (
          <NewCheck postId={game.postId} checksRemaining={viewer.checksRemaining} onSubmitted={handleChecked} />
        )}

        {viewer?.status === 'found' && (
          <View className="rounded-md px-3 py-2.5 items-center" style={{ backgroundColor: theme.surfaceAlt }}>
            <Text className="text-sm font-bold" style={{ color: Colors.brand }}>იპოვე {game.hostAlias}!</Text>
          </View>
        )}

        {live && viewer?.status === 'out_of_checks' && (
          <View className="rounded-md px-3 py-2.5 items-center" style={{ backgroundColor: theme.surfaceAlt }}>
            <Text className="text-sm" style={{ color: theme.textMuted }}>მცდელობები ამოგეწურა.</Text>
          </View>
        )}

        {live && isHost && (
          <Pressable
            onPress={endGame}
            disabled={busy}
            className="rounded-md px-4 py-2.5 items-center"
            style={{ borderWidth: 1, borderColor: theme.border, opacity: busy ? 0.5 : 1 }}
          >
            <Text className="text-sm font-bold" style={{ color: theme.text }}>თამაშის დასრულება</Text>
          </Pressable>
        )}

        {canSeeMap && (
          <Pressable
            onPress={() => setShowMap(true)}
            className="rounded-md px-4 py-2.5 items-center flex-row justify-center gap-2"
            style={{ backgroundColor: Colors.brand }}
          >
            <Feather name="map-pin" size={14} color={Colors.onAccent} />
            <Text className="text-sm font-bold" style={{ color: Colors.onAccent }}>მცდელობები რუკაზე</Text>
          </Pressable>
        )}

        {players.length > 0 && (
          <View className="gap-1">
            <Text className="text-xs font-bold uppercase" style={{ color: theme.textMuted }}>მეძებრები</Text>
            {players.map((p) => (
              <View
                key={p.id}
                className="flex-row items-center justify-between gap-3 rounded-md px-2.5 py-2"
                style={{ backgroundColor: p.userId === currentUserId ? theme.surfaceAlt : 'transparent' }}
              >
                <View className="flex-row items-center gap-2 flex-1">
                  {p.status === 'found' && <Feather name="check-circle" size={14} color={Colors.brand} />}
                  <Text className="text-sm" style={{ color: theme.text }} numberOfLines={1}>{p.alias}</Text>
                  {p.level != null && <LevelBadge level={p.level} />}
                </View>
                <View className="flex-row items-center gap-3">
                  {p.status === 'found' ? (
                    <Text className="text-sm font-bold" style={{ color: Colors.brand }}>იპოვა</Text>
                  ) : (
                    <Text className="text-sm" style={{ color: theme.textMuted }}>
                      {p.lastDistance != null ? formatDistance(p.lastDistance) : '-'}
                    </Text>
                  )}
                  <Text className="text-xs" style={{ color: theme.iconFaint }}>{p.checkCount}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {game.coordinates && (
          <Text className="text-xs" style={{ color: theme.iconFaint }}>
            {game.coordinates.latitude.toFixed(5)}, {game.coordinates.longitude.toFixed(5)}
          </Text>
        )}
      </View>

      {showMap && <ChecksMap postId={game.postId} onClose={() => setShowMap(false)} />}
    </View>
  );
}
