import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { Feather } from '@expo/vector-icons';
import { mapDefaultCenter, mapMaxBounds, mapMaxZoom } from '@/lib/map';
import { postsApi } from '@/lib/posts';
import type { MobilePostType } from '@/types/post';
import type { GuessResult } from '@/types/post-guess';

MapboxGL.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '');

type Phase = 'placing' | 'submitting' | 'result' | 'error';

type Props = {
  post: MobilePostType;
  onClose: () => void;
  onSubmitted: (result: GuessResult) => void;
};

export function NewGuess({ post, onClose, onSubmitted }: Props) {
  const cameraRef = useRef<MapboxGL.Camera>(null);

  const [phase, setPhase] = useState<Phase>('placing');
  const [guessCoords, setGuessCoords] = useState<[number, number]>(mapDefaultCenter); // [lng, lat]
  const [result, setResult] = useState<GuessResult | null>(null);
  const [showImage, setShowImage] = useState(false);

  const handleMapPress = (e: GeoJSON.Feature<GeoJSON.Point>) => {
    if (phase !== 'placing') return;
    setGuessCoords(e.geometry.coordinates as [number, number]);
  };

  const handleSubmit = async () => {
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
        <View className="flex-row items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800">
          <Text className="text-base font-semibold text-zinc-100 flex-1 mr-2" numberOfLines={1}>
            {post.title || 'გამოიცანი'}
          </Text>
          <View className="flex-row items-center gap-2">
            {post.image ? (
              <Pressable
                onPress={() => setShowImage((v) => !v)}
                className="p-2 rounded-md bg-zinc-800"
                hitSlop={8}
              >
                <Feather name={showImage ? 'map-pin' : 'image'} size={18} color="#E4E4E7" />
              </Pressable>
            ) : null}
            <Pressable onPress={onClose} className="p-2 rounded-md bg-zinc-800" hitSlop={8}>
              <Feather name="x" size={18} color="#E4E4E7" />
            </Pressable>
          </View>
        </View>

        {/* Image panel — toggleable */}
        {showImage && post.image ? (
          <View className="w-full bg-black" style={{ height: 260 }}>
            <Image
              source={{ uri: post.image }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
            />
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
            <MapboxGL.PointAnnotation id="guess-marker" coordinate={guessCoords}>
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: '#14B8A6',
                  borderWidth: 2,
                  borderColor: '#fff',
                }}
              />
            </MapboxGL.PointAnnotation>

            {/* Photo marker — red, shown after result */}
            {photoCoords ? (
              <MapboxGL.PointAnnotation id="photo-marker" coordinate={photoCoords}>
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: '#ef4444',
                    borderWidth: 2,
                    borderColor: '#fff',
                  }}
                />
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
        </View>

        {/* Bottom action bar */}
        <View className="px-4 pt-3 pb-8 bg-zinc-900 border-t border-zinc-800">
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
