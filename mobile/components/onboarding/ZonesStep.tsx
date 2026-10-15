import { useState } from 'react';
import { ActivityIndicator, Animated, FlatList, Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { zonesApi } from '@/lib/zones';
import type { OnboardingZone } from '@/lib/onboarding';
import { Colors, useTheme } from '@/constants/colors';

type Props = {
  zones: OnboardingZone[];
  /** Slugs joined so far. Lives in the flow, so it survives stepping back and forth. */
  joined: ReadonlySet<string>;
  onJoined: (slug: string) => void;
  padding: number;
  reduceMotion: boolean;
};

function ZoneRow({
  zone,
  joined,
  onJoined,
  reduceMotion,
}: {
  zone: OnboardingZone;
  joined: boolean;
  onJoined: (slug: string) => void;
  reduceMotion: boolean;
}) {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [scale] = useState(() => new Animated.Value(1));

  /** The join button swells and settles back once the join went through. */
  function pop() {
    if (reduceMotion) return;
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.12, duration: 110, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();
  }

  async function join() {
    if (loading || joined) return;
    setLoading(true);
    setFailed(false);
    try {
      await zonesApi.join(zone.slug);
      onJoined(zone.slug);
      pop();
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-3">
      <View className="flex-row items-center gap-3">
        <ProfileAvatar
          name={zone.slug}
          photoUrl={zone.profilePhotoUrl}
          size={44}
          initialsClassName="text-sm font-bold text-white"
        />

        <View className="flex-1">
          <Text className="text-sm font-bold text-zinc-900 dark:text-zinc-50" numberOfLines={1}>
            {zone.slug}
          </Text>
          {zone.description ? (
            <Text className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400" numberOfLines={2}>
              {zone.description}
            </Text>
          ) : null}
        </View>

        <Animated.View style={{ transform: [{ scale }] }}>
          <Pressable
            onPress={join}
            disabled={loading || joined}
            className={`flex-row items-center justify-center gap-1.5 rounded-md px-3 py-1.5 border min-w-[108px] ${
              joined
                ? 'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700'
                : 'bg-teal-600 border-teal-600'
            } ${loading ? 'opacity-60' : ''}`}
          >
            {loading ? (
              <ActivityIndicator size="small" color={Colors.onAccent} />
            ) : joined ? (
              <>
                <Feather name="check" size={14} color={theme.textMuted} />
                <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300">წევრი</Text>
              </>
            ) : (
              <Text className="text-sm font-medium text-white">გაწევრიანება</Text>
            )}
          </Pressable>
        </Animated.View>
      </View>

      {failed ? (
        <Text className="mt-2 text-xs text-red-500">გაწევრიანება ვერ მოხერხდა</Text>
      ) : null}
    </View>
  );
}

export function ZonesStep({ zones, joined, onJoined, padding, reduceMotion }: Props) {
  return (
    <FlatList
      data={zones}
      keyExtractor={(zone) => zone.slug}
      contentContainerStyle={{
        paddingHorizontal: padding,
        paddingTop: 32,
        paddingBottom: 16,
        gap: 10,
      }}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View className="mb-3">
          <Text className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50">
            აღმოაჩინე საბზონები
          </Text>
          <Text className="mt-2 text-sm leading-5 text-zinc-600 dark:text-zinc-300">
            საბზონი ცალკე სივრცეა საერთო თემის ან ადგილის გარშემო. გაწევრიანდი შენი ინტერესის მიხედვით
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <ZoneRow
          zone={item}
          joined={joined.has(item.slug)}
          onJoined={onJoined}
          reduceMotion={reduceMotion}
        />
      )}
    />
  );
}
