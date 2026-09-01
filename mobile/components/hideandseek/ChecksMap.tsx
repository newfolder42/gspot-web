import { useMemo } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { hideAndSeekApi } from '@/lib/hideAndSeek';
import { mapDefaultCenter, mapMaxBounds, mapMaxZoom } from '@/lib/map';
import { HIDING_SPOT_COLOR, formatDistance } from '@/types/hide-and-seek';

MapboxGL.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '');

/**
 * Host-only view of every check placed in a finished game, one colour per seeker, around
 * the spot they were actually hiding at. Mirrors the web ChecksMap modal, which in turn
 * mirrors the author's guesses map on a gps-photo post.
 */
export function ChecksMap({ postId, onClose }: { postId: number; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['hide-and-seek', 'check-map', postId],
    queryFn: () => hideAndSeekApi.getCheckMap(postId),
  });

  const hidingSpot = data?.hidingSpot ?? null;
  const points = data?.points ?? [];
  const seekers = useMemo(() => data?.seekers ?? [], [data?.seekers]);
  const colorOf = useMemo(
    () => new Map(seekers.map((s) => [s.userId, s.color])),
    [seekers]
  );

  const center: [number, number] = hidingSpot
    ? [hidingSpot.longitude, hidingSpot.latitude]
    : points[0]
      ? [points[0].coordinates.longitude, points[0].coordinates.latitude]
      : mapDefaultCenter;

  return (
    <Modal animationType="slide" presentationStyle="fullScreen" visible onRequestClose={onClose}>
      <View className="flex-1 bg-zinc-950">
        <View
          className="flex-row items-center justify-between px-4 pb-3 bg-zinc-900 border-b border-zinc-800"
          style={{ paddingTop: insets.top + 12 }}
        >
          <Text className="text-base font-semibold text-zinc-100">მცდელობები რუკაზე</Text>
          <Pressable onPress={onClose} className="p-2 rounded-md bg-zinc-800" hitSlop={8}>
            <Feather name="x" size={18} color={Colors.onImageMuted} />
          </Pressable>
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={Colors.brand} />
          </View>
        ) : isError || !data ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-sm text-rose-400 text-center">ჩატვირთვა ვერ მოხერხდა.</Text>
          </View>
        ) : points.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-sm text-zinc-400 text-center">
              ამ თამაშში მცდელობა არავის გაუკეთებია.
            </Text>
          </View>
        ) : (
          <View className="flex-1">
            <MapboxGL.MapView
              style={{ flex: 1 }}
              styleURL="mapbox://styles/mapbox/standard-satellite"
              pitchEnabled={false}
              rotateEnabled={false}
              attributionEnabled={false}
              logoEnabled={false}
            >
              <MapboxGL.Camera
                centerCoordinate={center}
                zoomLevel={13}
                maxBounds={mapMaxBounds}
                maxZoomLevel={mapMaxZoom}
              />

              {/* Where the host was actually hiding – red */}
              {hidingSpot ? (
                <MapboxGL.PointAnnotation
                  id="hiding-spot"
                  coordinate={[hidingSpot.longitude, hidingSpot.latitude]}
                  title="სამალავი"
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: HIDING_SPOT_COLOR,
                      borderWidth: 3,
                      borderColor: '#fff',
                    }}
                  />
                </MapboxGL.PointAnnotation>
              ) : null}

              {/* Each check, in its seeker's colour; the catching one is drawn larger */}
              {points.map((p) => {
                const size = p.found ? 22 : 16;
                return (
                  <MapboxGL.PointAnnotation
                    key={`check-${p.checkId}`}
                    id={`check-${p.checkId}`}
                    coordinate={[p.coordinates.longitude, p.coordinates.latitude]}
                    title={`'${p.author} · ${formatDistance(p.distanceMeters)}`}
                  >
                    <View
                      style={{
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        backgroundColor: colorOf.get(p.userId) ?? Colors.brand,
                        borderWidth: 2,
                        borderColor: '#fff',
                      }}
                    />
                  </MapboxGL.PointAnnotation>
                );
              })}
            </MapboxGL.MapView>

            {/* Legend – one row per seeker, so a colour can be read back to a name */}
            <View
              className="absolute left-4 right-4 rounded-xl bg-zinc-900/90 px-4 py-3"
              style={{ bottom: insets.bottom + 16, maxHeight: 160 }}
            >
              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="flex-row items-center gap-2 py-1">
                  <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: HIDING_SPOT_COLOR }} />
                  <Text className="text-xs text-zinc-300">სამალავი</Text>
                </View>
                {seekers.map((seeker) => (
                  <View key={seeker.userId} className="flex-row items-center gap-2 py-1">
                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: seeker.color }} />
                    <Text className="text-xs font-medium text-zinc-200">&apos;{seeker.alias}</Text>
                    <Text className="text-xs text-zinc-400">
                      {seeker.checkCount}
                      {seeker.bestDistance != null ? ` · ${formatDistance(seeker.bestDistance)}` : ''}
                    </Text>
                    {seeker.found ? (
                      <Text className="text-xs" style={{ color: Colors.brand }}>იპოვა</Text>
                    ) : null}
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}
