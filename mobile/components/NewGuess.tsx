import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { PinchZoomImage } from '@/components/ui/ZoomableImage';
import { mapDefaultCenter, mapMaxBounds, mapMaxZoom } from '@/lib/map';
import { postsApi } from '@/lib/posts';
import type { MobilePostType } from '@/types/post';
import type { GuessResult } from '@/types/post-guess';

MapboxGL.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '');

type Phase = 'placing' | 'submitting' | 'result' | 'error';

/**
 * The photo is either hidden, sharing the screen with the map as a band, or
 * blown up over the map — the web toggles image/map the same way, except there
 * the photo always takes the whole screen.
 */
type ImageMode = 'hidden' | 'band' | 'full';

const IMAGE_BAND_HEIGHT = 260;

/**
 * Teardrop pin matching the web's default mapbox marker: the tip — not the
 * centre of a blob — marks the coordinate, since guesses are scored in metres.
 * Pair with anchor={{ x: 0.5, y: 1 }} so the tip lands on the point.
 */
function MapPin({ color }: { color: string }) {
  return (
    <View style={{ width: 22, height: 30, alignItems: 'center' }}>
      {/* White outline of the tail */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          width: 0,
          height: 0,
          borderLeftWidth: 6,
          borderRightWidth: 6,
          borderTopWidth: 14,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: '#fff',
        }}
      />
      {/* Coloured tail, inset so the white outline stays visible */}
      <View
        style={{
          position: 'absolute',
          bottom: 3,
          width: 0,
          height: 0,
          borderLeftWidth: 4,
          borderRightWidth: 4,
          borderTopWidth: 9,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: color,
        }}
      />
      {/* Head */}
      <View
        style={{
          width: 18,
          height: 18,
          borderRadius: 9,
          backgroundColor: color,
          borderWidth: 2,
          borderColor: '#fff',
        }}
      />
    </View>
  );
}

type Props = {
  post: MobilePostType;
  onClose: () => void;
  onSubmitted: (result: GuessResult) => void;
};

export function NewGuess({ post, onClose, onSubmitted }: Props) {
  const cameraRef = useRef<MapboxGL.Camera>(null);
  // Full-screen modal draws under the system bars on edge-to-edge Android,
  // so header/action bar have to clear the status and navigation bars themselves.
  const insets = useSafeAreaInsets();

  const [phase, setPhase] = useState<Phase>('placing');
  const [guessCoords, setGuessCoords] = useState<[number, number]>(mapDefaultCenter); // [lng, lat]
  const [result, setResult] = useState<GuessResult | null>(null);
  const [imageMode, setImageMode] = useState<ImageMode>('hidden');

  const handleMapPress = (e: GeoJSON.Feature<GeoJSON.Point>) => {
    if (phase !== 'placing') return;
    setGuessCoords(e.geometry.coordinates as [number, number]);
  };

  const handleSubmit = async () => {
    // The result lands on the map, so get the photo out of the way first.
    setImageMode((m) => (m === 'full' ? 'band' : m));
    setPhase('submitting');
    try {
      const res = await postsApi.addGuess(post.id, {
        latitude: guessCoords[1],
        longitude: guessCoords[0],
      });

      setResult(res);
      setPhase('result');
      onSubmitted(res);

      const photoLng = res.photoCoordinates.longitude;
      const photoLat = res.photoCoordinates.latitude;
      cameraRef.current?.fitBounds(
        [Math.max(guessCoords[0], photoLng), Math.max(guessCoords[1], photoLat)],
        [Math.min(guessCoords[0], photoLng), Math.min(guessCoords[1], photoLat)],
        [80, 60, 100, 60],
        800
      );
    } catch {
      setPhase('error');
    }
  };

  const photoCoords: [number, number] | null = result
    ? [result.photoCoordinates.longitude, result.photoCoordinates.latitude]
    : null;

  return (
    <Modal animationType="slide" presentationStyle="fullScreen" visible>
      <View className="flex-1 bg-zinc-950">

        {/* Header */}
        <View
          className="flex-row items-center justify-between px-4 pb-3 bg-zinc-900 border-b border-zinc-800"
          style={{ paddingTop: insets.top + 12 }}
        >
          <Text className="text-base font-semibold text-zinc-100 flex-1 mr-2" numberOfLines={1}>
            {post.title || 'გამოიცანი'}
          </Text>
          <View className="flex-row items-center gap-2">
            {post.image ? (
              <Pressable
                onPress={() => setImageMode((m) => (m === 'hidden' ? 'band' : 'hidden'))}
                className="p-2 rounded-md bg-zinc-800"
                hitSlop={8}
              >
                <Feather
                  name={imageMode === 'hidden' ? 'image' : 'map-pin'}
                  size={18}
                  color={Colors.onImageMuted}
                />
              </Pressable>
            ) : null}
            <Pressable onPress={onClose} className="p-2 rounded-md bg-zinc-800" hitSlop={8}>
              <Feather name="x" size={18} color={Colors.onImageMuted} />
            </Pressable>
          </View>
        </View>

        {/* Image panel — toggleable, pinch and double-tap to zoom */}
        {imageMode === 'band' && post.image ? (
          <View className="w-full bg-black" style={{ height: IMAGE_BAND_HEIGHT }}>
            <PinchZoomImage uri={post.image} style={{ flex: 1 }} resizeMode="contain" />
            <Pressable
              onPress={() => setImageMode('full')}
              className="absolute bottom-2 right-2 p-2 rounded-md bg-zinc-900/80"
              hitSlop={8}
            >
              <Feather name="maximize-2" size={16} color={Colors.onImageMuted} />
            </Pressable>
          </View>
        ) : null}

        {/* Map */}
        <View className="flex-1 relative">
          <MapboxGL.MapView
            style={{ flex: 1 }}
            styleURL="mapbox://styles/mapbox/standard-satellite"
            onPress={handleMapPress}
            scrollEnabled
            pitchEnabled={false}
            rotateEnabled={false}
            attributionEnabled={false}
            logoEnabled={false}
          >
            <MapboxGL.Camera
              ref={cameraRef}
              centerCoordinate={mapDefaultCenter}
              zoomLevel={10}
              maxBounds={mapMaxBounds}
              maxZoomLevel={mapMaxZoom}
            />

            {/* Guess marker — teal */}
            <MapboxGL.PointAnnotation
              id="guess-marker"
              coordinate={guessCoords}
              anchor={{ x: 0.5, y: 1 }}
            >
              <MapPin color="#14B8A6" />
            </MapboxGL.PointAnnotation>

            {/* Photo marker — red, shown after result */}
            {photoCoords ? (
              <MapboxGL.PointAnnotation
                id="photo-marker"
                coordinate={photoCoords}
                anchor={{ x: 0.5, y: 1 }}
              >
                <MapPin color="#ef4444" />
              </MapboxGL.PointAnnotation>
            ) : null}

            {/* Distance line — yellow dashed */}
            {photoCoords ? (
              <MapboxGL.ShapeSource
                id="distance-line-source"
                shape={{
                  type: 'Feature',
                  geometry: {
                    type: 'LineString',
                    coordinates: [guessCoords, photoCoords],
                  },
                  properties: {},
                }}
              >
                <MapboxGL.LineLayer
                  id="distance-line-layer"
                  style={{
                    lineColor: '#fbbf24',
                    lineWidth: 2,
                    lineDasharray: [4, 4],
                  }}
                />
              </MapboxGL.ShapeSource>
            ) : null}
          </MapboxGL.MapView>

          {/* Coordinates — top right overlay */}
          <View className="absolute top-3 right-3 pointer-events-none">
            <View className="px-3 py-1.5 rounded-lg bg-zinc-900/90">
              <Text className="text-xs text-zinc-300" style={{ fontVariant: ['tabular-nums'] }}>
                {guessCoords[1].toFixed(4)}, {guessCoords[0].toFixed(4)}
              </Text>
            </View>
          </View>

          {/* Result card — shown after submit */}
          {phase === 'result' && result ? (
            <View className="absolute bottom-4 left-4 right-4">
              <View className="rounded-xl bg-zinc-900/95 px-6 py-4 flex-row items-center justify-center gap-8">
                <View className="items-center">
                  <Text className="text-xs text-zinc-400 mb-1">ქულა</Text>
                  <Text className="text-3xl font-bold text-teal-400">{result.guess.score}</Text>
                </View>
                <View style={{ width: 1, height: 40, backgroundColor: '#3f3f46' }} />
                <View className="items-center">
                  <Text className="text-xs text-zinc-400 mb-1">მანძილი</Text>
                  <Text className="text-3xl font-bold text-zinc-100">
                    {result.guess.distance != null
                      ? `${result.guess.distance.toLocaleString('ka-GE')} მ`
                      : '—'}
                  </Text>
                </View>
              </View>
            </View>
          ) : null}

          {/* Error card */}
          {phase === 'error' ? (
            <View className="absolute bottom-4 left-4 right-4">
              <View className="rounded-xl bg-rose-950 px-4 py-3">
                <Text className="text-sm text-rose-200 text-center">შეცდომა. სცადე ხელახლა.</Text>
              </View>
            </View>
          ) : null}

          {/* Expanded photo - covers the map, which stays mounted underneath */}
          {imageMode === 'full' && post.image ? (
            <View style={StyleSheet.absoluteFill} className="bg-black">
              <PinchZoomImage uri={post.image} style={{ flex: 1 }} resizeMode="contain" />
              <Pressable
                onPress={() => setImageMode('band')}
                className="absolute bottom-2 right-2 p-2 rounded-md bg-zinc-900/80"
                hitSlop={8}
              >
                <Feather name="minimize-2" size={16} color={Colors.onImageMuted} />
              </Pressable>
            </View>
          ) : null}
        </View>

        {/* Bottom action bar */}
        <View
          className="px-4 pt-3 bg-zinc-900 border-t border-zinc-800"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          {phase === 'placing' ? (
            <Pressable
              onPress={handleSubmit}
              className="h-12 rounded-xl bg-teal-600 items-center justify-center active:opacity-80"
            >
              <Text className="text-base font-semibold text-white">ცდა</Text>
            </Pressable>
          ) : phase === 'submitting' ? (
            <View className="h-12 rounded-xl bg-teal-800 items-center justify-center">
              <ActivityIndicator color="#fff" />
            </View>
          ) : phase === 'result' ? (
            <Pressable
              onPress={onClose}
              className="h-12 rounded-xl bg-zinc-700 items-center justify-center active:opacity-80"
            >
              <Text className="text-base font-semibold text-zinc-100">დახურვა</Text>
            </Pressable>
          ) : (
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => setPhase('placing')}
                className="flex-1 h-12 rounded-xl bg-teal-700 items-center justify-center active:opacity-80"
              >
                <Text className="text-base font-semibold text-white">ხელახლა ცდა</Text>
              </Pressable>
              <Pressable
                onPress={onClose}
                className="flex-1 h-12 rounded-xl bg-zinc-700 items-center justify-center active:opacity-80"
              >
                <Text className="text-base font-semibold text-zinc-400">დახურვა</Text>
              </Pressable>
            </View>
          )}
        </View>

      </View>
    </Modal>
  );
}
