import { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { hideAndSeekApi } from '@/lib/hideAndSeek';
import { MapPin, MAP_PIN_ANCHOR } from '@/components/map/MapPin';
import {
  fitCamera,
  mapFitMaxZoom,
  mapFitPadding,
  mapMaxBounds,
  mapMaxZoom,
  mapPinScale,
} from '@/lib/map';
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
  const points = useMemo(() => data?.points ?? [], [data?.points]);
  const seekers = useMemo(() => data?.seekers ?? [], [data?.seekers]);
  const colorOf = useMemo(
    () => new Map(seekers.map((s) => [s.userId, s.color])),
    [seekers]
  );

  // The camera fits every point, so it needs the map's size and the legend's height first.
  const [mapSize, setMapSize] = useState<{ width: number; height: number } | null>(null);
  const [legendHeight, setLegendHeight] = useState<number | null>(null);
  const legendBottom = insets.bottom + 16;

  const camera = useMemo(() => {
    if (!mapSize || legendHeight == null) return null;
    const coords: [number, number][] = points.map((p) => [p.coordinates.longitude, p.coordinates.latitude]);
    if (hidingSpot) coords.push([hidingSpot.longitude, hidingSpot.latitude]);
    if (coords.length === 0) return null;
    return fitCamera(
      coords,
      mapSize,
      { top: mapFitPadding, right: mapFitPadding, left: mapFitPadding, bottom: mapFitPadding + legendHeight + legendBottom },
      mapFitMaxZoom
    );
  }, [mapSize, legendHeight, legendBottom, points, hidingSpot]);

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
          <View
            className="flex-1"
            onLayout={(e) => setMapSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
          >
            {camera ? (
              <MapboxGL.MapView
                style={{ flex: 1 }}
                styleURL="mapbox://styles/mapbox/standard-satellite"
                pitchEnabled={false}
                rotateEnabled={false}
                attributionEnabled={false}
                logoEnabled={false}
              >
                {/* Uncontrolled camera: the checks are already loaded by the time this
                    renders, so `defaultSettings` opens fitted to them, with no fly-in. */}
                <MapboxGL.Camera
                  defaultSettings={camera}
                  maxBounds={mapMaxBounds}
                  maxZoomLevel={mapMaxZoom}
                />

                {/* Each check, in its seeker's colour; the catching one is drawn larger */}
                {points.map((p) => (
                  <MapboxGL.PointAnnotation
                    key={`check-${p.checkId}`}
                    id={`check-${p.checkId}`}
                    coordinate={[p.coordinates.longitude, p.coordinates.latitude]}
                    anchor={MAP_PIN_ANCHOR}
                    title={`'${p.author} · ${formatDistance(p.distanceMeters)}`}
                  >
                    <MapPin
                      color={colorOf.get(p.userId) ?? Colors.brand}
                      scale={p.found ? mapPinScale.primary : mapPinScale.point}
                    />
                  </MapboxGL.PointAnnotation>
                ))}

                {/* Where the host was actually hiding – red, added last so it stays on top */}
                {hidingSpot ? (
                  <MapboxGL.PointAnnotation
                    id="hiding-spot"
                    coordinate={[hidingSpot.longitude, hidingSpot.latitude]}
                    anchor={MAP_PIN_ANCHOR}
                    title="სამალავი"
                  >
                    <MapPin color={HIDING_SPOT_COLOR} />
                  </MapboxGL.PointAnnotation>
                ) : null}
              </MapboxGL.MapView>
            ) : null}

            {/* Legend – one row per seeker, so a colour can be read back to a name */}
            <View
              className="absolute left-4 right-4 rounded-xl bg-zinc-900/90 px-4 py-3"
              style={{ bottom: legendBottom, maxHeight: 160 }}
              onLayout={(e) => setLegendHeight(e.nativeEvent.layout.height)}
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
