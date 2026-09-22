import { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { postsApi } from '@/lib/posts';
import { MapPin, MAP_PIN_ANCHOR } from '@/components/map/MapPin';
import {
  fitCamera,
  mapFitMaxZoom,
  mapFitPadding,
  mapMaxBounds,
  mapMaxZoom,
  mapPinColors,
  mapPinScale,
} from '@/lib/map';

MapboxGL.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '');

/**
 * Author-only view of every guess placed on a post, with the real photo
 * location in red. Mirrors the web "რუკაზე ნახვა" modal.
 */
export function GuessesMap({ postId, onClose }: { postId: number; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['post-guess-map', postId],
    queryFn: () => postsApi.getGuessMap(postId),
  });

  const photo = data?.photoCoordinates ?? null;
  const points = useMemo(() => data?.guessPoints ?? [], [data?.guessPoints]);
  const hasAnything = points.length > 0 || photo != null;

  // The camera fits every point, so it needs the map's size and the legend's height first.
  const [mapSize, setMapSize] = useState<{ width: number; height: number } | null>(null);
  const [legendHeight, setLegendHeight] = useState<number | null>(null);
  const legendBottom = insets.bottom + 16;

  const camera = useMemo(() => {
    if (!mapSize || legendHeight == null) return null;
    const coords: [number, number][] = points.map((p) => [p.coordinates.longitude, p.coordinates.latitude]);
    if (photo) coords.push([photo.longitude, photo.latitude]);
    if (coords.length === 0) return null;
    return fitCamera(
      coords,
      mapSize,
      { top: mapFitPadding, right: mapFitPadding, left: mapFitPadding, bottom: mapFitPadding + legendHeight + legendBottom },
      mapFitMaxZoom
    );
  }, [mapSize, legendHeight, legendBottom, points, photo]);

  return (
    <Modal animationType="slide" presentationStyle="fullScreen" visible onRequestClose={onClose}>
      <View className="flex-1 bg-zinc-950">
        <View
          className="flex-row items-center justify-between px-4 pb-3 bg-zinc-900 border-b border-zinc-800"
          style={{ paddingTop: insets.top + 12 }}
        >
          <Text className="text-base font-semibold text-zinc-100">გამოცნობები რუკაზე</Text>
          <Pressable onPress={onClose} className="p-2 rounded-md bg-zinc-800" hitSlop={8}>
            <Feather name="x" size={18} color={Colors.onImageMuted} />
          </Pressable>
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#14B8A6" />
          </View>
        ) : isError ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-sm text-rose-400 text-center">ჩატვირთვა ვერ მოხერხდა.</Text>
          </View>
        ) : !hasAnything ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-sm text-zinc-400 text-center">
              ამ პოსტის გამოცნობებისთვის რუკის წერტილები ვერ მოიძებნა.
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
                {/* Uncontrolled camera: the guesses are already loaded by the time this
                    renders, so `defaultSettings` opens fitted to them, with no fly-in. */}
                <MapboxGL.Camera
                  defaultSettings={camera}
                  maxBounds={mapMaxBounds}
                  maxZoomLevel={mapMaxZoom}
                />

                {/* Each guess – teal, labelled with author + distance on tap */}
                {points.map((p, i) => (
                  <MapboxGL.PointAnnotation
                    key={`guess-${i}`}
                    id={`guess-${i}`}
                    coordinate={[p.coordinates.longitude, p.coordinates.latitude]}
                    anchor={MAP_PIN_ANCHOR}
                    title={`'${p.author} · ${p.distance ?? '-'} მ`}
                  >
                    <MapPin color={mapPinColors.pick} scale={mapPinScale.point} />
                  </MapboxGL.PointAnnotation>
                ))}

                {/* Real photo location – red, added last so it stays on top of the guesses */}
                {photo ? (
                  <MapboxGL.PointAnnotation
                    id="photo-marker"
                    coordinate={[photo.longitude, photo.latitude]}
                    anchor={MAP_PIN_ANCHOR}
                  >
                    <MapPin color={mapPinColors.truth} />
                  </MapboxGL.PointAnnotation>
                ) : null}
              </MapboxGL.MapView>
            ) : null}

            {/* Legend */}
            <View
              className="absolute left-4 right-4 rounded-xl bg-zinc-900/90 px-4 py-3 flex-row items-center justify-center gap-6"
              style={{ bottom: legendBottom }}
              onLayout={(e) => setLegendHeight(e.nativeEvent.layout.height)}
            >
              <View className="flex-row items-center gap-2">
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: mapPinColors.truth }} />
                <Text className="text-xs text-zinc-300">ფოტოს ლოკაცია</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: mapPinColors.pick }} />
                <Text className="text-xs text-zinc-300">გამოცნობები ({points.length})</Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}
