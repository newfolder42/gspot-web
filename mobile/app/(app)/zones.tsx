import { ActivityIndicator, FlatList, Image, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { searchApi, type MobileZone } from '@/lib/search';
import { useLayout } from '@/lib/layout';
import { useTheme } from '@/constants/colors';

const GAP = 12;
/** Cards never get narrower than this, so a wider window fits more columns (2 upright). */
const MIN_CARD_WIDTH = 170;
const MAX_COLUMNS = 4;

function ZoneCard({ zone, width }: { zone: MobileZone; width: number }) {
  const router = useRouter();
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/(app)/zone/[slug]', params: { slug: zone.slug } })}
      style={{ width }}
      className="rounded-xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800"
    >
      {/* Banner / cover image */}
      <View className="w-full bg-zinc-200 dark:bg-zinc-800" style={{ height: width * 0.55 }}>
        {zone.bannerUrl ? (
          <Image
            source={{ uri: zone.bannerUrl }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="image" size={28} color={theme.icon} />
          </View>
        )}
        {zone.isMember ? (
          <View className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-teal-600">
            <Text className="text-[9px] font-bold text-white">წევრი</Text>
          </View>
        ) : null}
        {zone.joinPolicy !== 'open' ? (
          <View className="absolute top-2 left-2 p-1 rounded-full bg-zinc-900/60">
            <Feather name="lock" size={10} color="#fff" />
          </View>
        ) : null}
      </View>

      {/* Avatar overlapping */}
      <View style={{ marginTop: -18, paddingHorizontal: 10 }}>
        <ProfileAvatar name={zone.slug} photoUrl={zone.profilePhotoUrl} size={36} shape="md" />
      </View>

      {/* Info */}
      <View className="px-2.5 pt-1 pb-3">
        <Text className="text-sm font-bold text-zinc-900 dark:text-zinc-50" numberOfLines={1}>{zone.slug}</Text>
        {zone.description ? (
          <Text className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5" numberOfLines={2}>{zone.description}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function ZonesScreen() {
  const insets = useSafeAreaInsets();
  const { availableWidth } = useLayout();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['zones-list'],
    queryFn: () => searchApi.getZones(),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <ActivityIndicator size="large" color="#14B8A6" />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View className="flex-1 items-center justify-center px-8 bg-zinc-50 dark:bg-zinc-950">
        <Text className="text-sm text-zinc-500 dark:text-zinc-400 text-center mb-4">ჩატვირთვა ვერ მოხერხდა</Text>
        <Pressable onPress={() => refetch()} className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
          <Text className="text-brand text-sm font-semibold">ხელახლა ცდა</Text>
        </Pressable>
      </View>
    );
  }

  const myZones = data.zones.filter((z) => z.isMember);
  const otherZones = data.zones.filter((z) => !z.isMember);

  // Upright (~390dp) this is the old 2-column grid with the same card width.
  const gridWidth = availableWidth - GAP * 2;
  const columns = Math.min(MAX_COLUMNS, Math.max(2, Math.floor((gridWidth + GAP) / (MIN_CARD_WIDTH + GAP))));
  const cardWidth = (gridWidth - GAP * (columns - 1)) / columns;

  type ListItem =
    | { type: 'header'; key: string; label: string }
    | { type: 'row'; key: string; zones: MobileZone[] };

  const items: ListItem[] = [];

  function toRows(zones: MobileZone[], prefix: string): ListItem[] {
    const rows: ListItem[] = [];
    for (let i = 0; i < zones.length; i += columns) {
      rows.push({ type: 'row', key: `${prefix}-${i}`, zones: zones.slice(i, i + columns) });
    }
    return rows;
  }

  if (myZones.length > 0) {
    items.push({ type: 'header', key: 'h-mine', label: 'ჩემი საბზონები' });
    items.push(...toRows(myZones, 'mine'));
  }
  if (otherZones.length > 0) {
    items.push({ type: 'header', key: 'h-all', label: 'ყველა საბზონი' });
    items.push(...toRows(otherZones, 'all'));
  }

  return (
    <FlatList
      className="flex-1 bg-zinc-50 dark:bg-zinc-950"
      contentContainerStyle={{ padding: 12, paddingBottom: 12 + insets.bottom, gap: 12 }}
      data={items}
      keyExtractor={(item) => item.key}
      renderItem={({ item }) => {
        if (item.type === 'header') {
          return (
            <View className="pb-1 pt-2">
              <Text className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                {item.label}
              </Text>
            </View>
          );
        }
        return (
          <View style={{ flexDirection: 'row', gap: GAP }}>
            {item.zones.map((zone) => (
              <ZoneCard key={zone.slug} zone={zone} width={cardWidth} />
            ))}
          </View>
        );
      }}
      ListEmptyComponent={
        <View className="py-16 items-center">
          <Text className="text-sm text-zinc-500 dark:text-zinc-400">საბზონები ვერ მოიძებნა</Text>
        </View>
      }
    />
  );
}
