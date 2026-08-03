import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { postsApi } from '@/lib/posts';
import { mapDefaultCenter, mapMaxBounds, mapMaxZoom } from '@/lib/map';

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
  const points = data?.guessPoints ?? [];
  const hasAnything = points.length > 0 || photo != null;

  const center: [number, number] = photo
    ? [photo.longitude, photo.latitude]
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
          <Text className="text-base font-semibold text-zinc-100">გამოცნობები რუკაზე</Text>
          <Pressable onPress={onClose} className="p-2 rounded-md bg-zinc-800" hitSlop={8}>
            <Feather name="x" size={18} color="#E4E4E7" />
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
                zoomLevel={10}
                maxBounds={mapMaxBounds}
                maxZoomLevel={mapMaxZoom}
              />

              {/* Real photo location – red */}
              {photo ? (
                <MapboxGL.PointAnnotation id="photo-marker" coordinate={[photo.longitude, photo.latitude]}>
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: '#ef4444',
                      borderWidth: 3,
                      borderColor: '#fff',
                    }}
                  />
                </MapboxGL.PointAnnotation>
              ) : null}

              {/* Each guess – teal, labelled with author + distance on tap */}
              {points.map((p, i) => (
                <MapboxGL.PointAnnotation
                  key={`guess-${i}`}
                  id={`guess-${i}`}
                  coordinate={[p.coordinates.longitude, p.coordinates.latitude]}
                  title={`'${p.author} · ${p.distance ?? '-'} მ`}
                >
                  <View
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 8,
                      backgroundColor: '#14B8A6',
                      borderWidth: 2,
                      borderColor: '#fff',
                    }}
                  />
                </MapboxGL.PointAnnotation>
              ))}
            </MapboxGL.MapView>

            {/* Legend */}
            <View
              className="absolute left-4 right-4 rounded-xl bg-zinc-900/90 px-4 py-3 flex-row items-center justify-center gap-6"
              style={{ bottom: insets.bottom + 16 }}
            >
              <View className="flex-row items-center gap-2">
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#ef4444' }} />
                <Text className="text-xs text-zinc-300">ფოტოს ლოკაცია</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#14B8A6' }} />
                <Text className="text-xs text-zinc-300">გამოცნობები ({points.length})</Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}
