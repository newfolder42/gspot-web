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
import { MapPin, MAP_PIN_ANCHOR } from '@/components/map/MapPin';
import {
  fitCamera,
  mapDefaultCenter,
  mapMaxBounds,
  mapMaxZoom,
  mapOverviewZoom,
  mapPinColors,
  mapResultMaxZoom,
  mapResultPadding,
} from '@/lib/map';
import { isAlreadyGuessedError, postsApi } from '@/lib/posts';
import { useLayout } from '@/lib/layout';
import type { MobilePostType } from '@/types/post';
import type { GuessResult } from '@/types/post-guess';

MapboxGL.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '');

type Phase = 'placing' | 'submitting' | 'result' | 'already' | 'error';

/**
 * The photo is either hidden, sharing the screen with the map as a band, or
 * blown up over the map — the web toggles image/map the same way, except there
 * the photo always takes the whole screen.
 */
type ImageMode = 'hidden' | 'band' | 'full';

/** Upright the photo band is this tall, above the map. */
const IMAGE_BAND_HEIGHT = 260;
/** Sideways the photo gets this share of the width, beside the map. */
const IMAGE_PANE_WIDTH = '40%';
/** Sideways the actions sit in the header, in a slot this wide. */
const HEADER_ACTIONS_WIDTH = 220;

type Props = {
  post: MobilePostType;
  onClose: () => void;
  onSubmitted: (result: GuessResult) => void;
  /** The server says this post was guessed already (elsewhere, since the caller loaded it). */
  onAlreadyGuessed?: () => void;
};

export function NewGuess({ post, onClose, onSubmitted, onAlreadyGuessed }: Props) {
  const cameraRef = useRef<MapboxGL.Camera>(null);
  // Full-screen modal draws under the system bars on edge-to-edge Android,
  // so header/action bar have to clear the status and navigation bars themselves.
  const insets = useSafeAreaInsets();
  // Sideways the screen is barely 360dp tall, so a header + photo band + action bar
  // stacked upright would leave the map a sliver. Instead the photo goes beside the
  // map and the actions move up into the header.
  const { isTwoPane } = useLayout();

  const [phase, setPhase] = useState<Phase>('placing');
  // No pin until the player taps the map: nothing to submit by accident, and the
  // camera sits on Tbilisi instead of on a ready-made answer.
  const [guessCoords, setGuessCoords] = useState<[number, number] | null>(null); // [lng, lat]
  const [result, setResult] = useState<GuessResult | null>(null);
  const [imageMode, setImageMode] = useState<ImageMode>('hidden');
  // Map size, for fitting guess + photo with a zoom cap rnmapbox's fitBounds lacks.
  const mapSizeRef = useRef({ width: 0, height: 0 });

  const handleMapPress = (e: GeoJSON.Feature<GeoJSON.Point>) => {
    if (phase !== 'placing') return;
    setGuessCoords(e.geometry.coordinates as [number, number]);
  };

  const handleDragEnd = (e: GeoJSON.Feature<GeoJSON.Point>) => {
    setGuessCoords(e.geometry.coordinates as [number, number]);
  };

  const handleSubmit = async () => {
    if (!guessCoords) return;
    const coords = guessCoords;
    // The result lands on the map, so get the photo out of the way first.
    setImageMode((m) => (m === 'full' ? 'band' : m));
    setPhase('submitting');
    try {
      const res = await postsApi.addGuess(post.id, {
        latitude: coords[1],
        longitude: coords[0],
      });

      setResult(res);
      setPhase('result');
      onSubmitted(res);

      const photo: [number, number] = [res.photoCoordinates.longitude, res.photoCoordinates.latitude];
      cameraRef.current?.setCamera({
        ...fitCamera([coords, photo], mapSizeRef.current, mapResultPadding, mapResultMaxZoom),
        animationDuration: 800,
      });
    } catch (err) {
      // Retrying can't help here, so say what happened instead of offering to.
      if (isAlreadyGuessedError(err)) {
        setPhase('already');
        onAlreadyGuessed?.();
      } else {
        setPhase('error');
      }
    }
  };

  const photoCoords: [number, number] | null = result
    ? [result.photoCoordinates.longitude, result.photoCoordinates.latitude]
    : null;

  const imageShown = imageMode !== 'hidden';

  // The image toggle and the actions for the current phase. Upright they sit in the
  // bottom bar; sideways they move into the header, where a 40dp button row costs
  // far less of the 360dp height than a bar of their own.
  const buttonH = isTwoPane ? 'h-10' : 'h-12';

  // A checkbox, not a swap: the icon stays, the lit state says the photo is up.
  const imageToggle = post.image ? (
    <Pressable
      onPress={() => setImageMode((m) => (m === 'hidden' ? 'band' : 'hidden'))}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: imageShown }}
      accessibilityLabel="სურათი"
      className={`${isTwoPane ? 'h-10 w-10' : 'h-12 w-12'} rounded-xl items-center justify-center border active:opacity-80 ${
        imageShown ? 'bg-teal-500/20 border-teal-400' : 'bg-zinc-800 border-zinc-800'
      }`}
    >
      <Feather name="image" size={20} color={imageShown ? '#5EEAD4' : Colors.onImageMuted} />
    </Pressable>
  ) : null;

  const actions = phase === 'placing' ? (
    <Pressable
      onPress={handleSubmit}
      disabled={!guessCoords}
      className={`${buttonH} rounded-xl flex-row items-center justify-center gap-2 active:opacity-80 ${
        guessCoords ? 'bg-teal-600' : 'bg-teal-900'
      }`}
    >
      <Feather name="map-pin" size={18} color={guessCoords ? '#fff' : 'rgba(153,246,228,0.5)'} />
      <Text className={`text-base font-semibold ${guessCoords ? 'text-white' : 'text-teal-200/50'}`}>
        ცდა
      </Text>
    </Pressable>
  ) : phase === 'submitting' ? (
    <View className={`${buttonH} rounded-xl bg-teal-800 items-center justify-center`}>
      <ActivityIndicator color="#fff" />
    </View>
  ) : phase === 'result' || phase === 'already' ? (
    <Pressable
      onPress={onClose}
      className={`${buttonH} rounded-xl bg-zinc-700 items-center justify-center active:opacity-80`}
    >
      <Text className="text-base font-semibold text-zinc-100">დახურვა</Text>
    </Pressable>
  ) : (
    <View className="flex-row gap-3">
      <Pressable
        onPress={() => setPhase('placing')}
        className={`flex-1 ${buttonH} rounded-xl bg-teal-700 items-center justify-center active:opacity-80`}
      >
        <Text className="text-base font-semibold text-white">ხელახლა ცდა</Text>
      </Pressable>
      <Pressable
        onPress={onClose}
        className={`flex-1 ${buttonH} rounded-xl bg-zinc-700 items-center justify-center active:opacity-80`}
      >
        <Text className="text-base font-semibold text-zinc-400">დახურვა</Text>
      </Pressable>
    </View>
  );

  return (
    // Android back closes the guess and lands on the card/post underneath; the
    // answer is already on its way once submitting, so back waits it out.
    <Modal
      animationType="slide"
      presentationStyle="fullScreen"
      visible
      onRequestClose={() => { if (phase !== 'submitting') onClose(); }}
    >
      <View className="flex-1 bg-zinc-950">

        {/* Header — sideways it also carries the image toggle and the actions */}
        <View
          className={`flex-row items-center bg-zinc-900 border-b border-zinc-800 ${
            isTwoPane ? 'gap-3 pb-2' : 'justify-between pb-3'
          }`}
          style={{
            paddingTop: insets.top + (isTwoPane ? 6 : 12),
            paddingLeft: 16 + insets.left,
            paddingRight: 16 + insets.right,
          }}
        >
          <Text className="text-base font-semibold text-zinc-100 flex-1 mr-2" numberOfLines={1}>
            {post.title || 'გამოიცანი'}
          </Text>
          {isTwoPane ? (
            <>
              {imageToggle}
              <View style={{ width: HEADER_ACTIONS_WIDTH }}>{actions}</View>
            </>
          ) : null}
          <Pressable onPress={onClose} className="p-2 rounded-md bg-zinc-800" hitSlop={8}>
            <Feather name="x" size={18} color={Colors.onImageMuted} />
          </Pressable>
        </View>

        {/* Photo + map: stacked upright, side by side sideways. The map stays the
            same child either way, so turning the phone does not rebuild it. */}
        <View
          style={{
            flex: 1,
            flexDirection: isTwoPane ? 'row' : 'column',
            paddingLeft: insets.left,
            paddingRight: insets.right,
            // Sideways there is no bottom bar to clear the navigation bar for us.
            paddingBottom: isTwoPane ? insets.bottom : 0,
          }}
        >
          {/* Image panel — toggleable, pinch and double-tap to zoom */}
          {imageMode === 'band' && post.image ? (
            <View
              className="bg-black"
              style={isTwoPane ? { width: IMAGE_PANE_WIDTH } : { width: '100%', height: IMAGE_BAND_HEIGHT }}
            >
              {/* Guessing wants every pixel of the master, but the feed rendition is
                  already cached from the list — show that rather than black while the
                  several MB come down. */}
              <PinchZoomImage
                uri={post.image}
                placeholderUri={post.imageVariants?.feed}
                style={{ flex: 1 }}
                resizeMode="contain"
              />
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
          <View
            className="flex-1 relative"
            onLayout={(e) => {
              const { width, height } = e.nativeEvent.layout;
              mapSizeRef.current = { width, height };
            }}
          >
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
              {/* Uncontrolled camera: `defaultSettings` places the initial view without
                  the fly-in a controlled centerCoordinate/zoomLevel would animate. */}
              <MapboxGL.Camera
                ref={cameraRef}
                defaultSettings={{ centerCoordinate: mapDefaultCenter, zoomLevel: mapOverviewZoom }}
                maxBounds={mapMaxBounds}
                maxZoomLevel={mapMaxZoom}
              />

              {/* Guess marker — teal, only once the player has placed it; draggable until submitted */}
              {guessCoords ? (
                <MapboxGL.PointAnnotation
                  id="guess-marker"
                  coordinate={guessCoords}
                  anchor={MAP_PIN_ANCHOR}
                  draggable={phase === 'placing'}
                  onDragEnd={handleDragEnd}
                >
                  <MapPin color={mapPinColors.pick} />
                </MapboxGL.PointAnnotation>
              ) : null}

              {/* Photo marker — red, shown after result */}
              {photoCoords ? (
                <MapboxGL.PointAnnotation
                  id="photo-marker"
                  coordinate={photoCoords}
                  anchor={MAP_PIN_ANCHOR}
                >
                  <MapPin color={mapPinColors.truth} />
                </MapboxGL.PointAnnotation>
              ) : null}

              {/* Distance line — yellow dashed */}
              {photoCoords && guessCoords ? (
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
                      lineColor: mapPinColors.line,
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
                  {guessCoords
                    ? `${guessCoords[1].toFixed(4)}, ${guessCoords[0].toFixed(4)}`
                    : 'მონიშნე ადგილი რუკაზე'}
                </Text>
              </View>
            </View>

            {/* Result card — shown after submit */}
            {phase === 'result' && result ? (
              <View className="absolute bottom-4 left-4 right-4">
                <View
                  className={`rounded-xl bg-zinc-900/95 flex-row items-center justify-center ${
                    isTwoPane ? 'px-4 py-2.5 gap-6' : 'px-6 py-4 gap-8'
                  }`}
                >
                  <View className="items-center">
                    <Text className="text-xs text-zinc-400 mb-1">ქულა</Text>
                    <Text className={`${isTwoPane ? 'text-2xl' : 'text-3xl'} font-bold text-teal-400`}>{result.guess.score}</Text>
                  </View>
                  <View style={{ width: 1, height: 40, backgroundColor: '#3f3f46' }} />
                  <View className="items-center">
                    <Text className="text-xs text-zinc-400 mb-1">მანძილი</Text>
                    <Text className={`${isTwoPane ? 'text-2xl' : 'text-3xl'} font-bold text-zinc-100`}>
                      {result.guess.distance != null
                        ? `${result.guess.distance.toLocaleString('ka-GE')} მ`
                        : '—'}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}

            {/* Guessed already — no score to show, just the reason nothing was saved */}
            {phase === 'already' ? (
              <View className="absolute bottom-4 left-4 right-4">
                <View className="rounded-xl bg-zinc-900/95 px-4 py-3">
                  <Text className="text-sm text-zinc-100 text-center">ეს უკვე გამოცნობილი გაქვს</Text>
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
                <PinchZoomImage
                  uri={post.image}
                  placeholderUri={post.imageVariants?.feed}
                  style={{ flex: 1 }}
                  resizeMode="contain"
                />
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
        </View>

        {/* Bottom action bar — the image toggle sits beside the thumb-reach actions */}
        {!isTwoPane ? (
          <View
            className="flex-row items-center gap-3 pt-3 bg-zinc-900 border-t border-zinc-800"
            style={{ paddingBottom: insets.bottom + 12, paddingLeft: 16 + insets.left, paddingRight: 16 + insets.right }}
          >
            {imageToggle}
            <View className="flex-1">{actions}</View>
          </View>
        ) : null}

      </View>
    </Modal>
  );
}
