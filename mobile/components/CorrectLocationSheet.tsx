import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, Text, View } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { PinchZoomImage } from '@/components/ui/ZoomableImage';
import { MapPin, MAP_PIN_ANCHOR } from '@/components/map/MapPin';
import {
  mapDefaultCenter,
  mapFitMaxZoom,
  mapMaxBounds,
  mapMaxZoom,
  mapOverviewZoom,
  mapPinColors,
} from '@/lib/map';
import { postsApi } from '@/lib/posts';
import { ZoneRulesList } from '@/components/ZoneRulesList';
import { useLayout } from '@/lib/layout';
import type { MobilePostType } from '@/types/post';

MapboxGL.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '');

/** Upright the photo band is this tall, above the map. */
const IMAGE_BAND_HEIGHT = 220;
/** Sideways the photo gets this share of the width, beside the map. */
const IMAGE_PANE_WIDTH = '40%';

type Props = {
  post: Pick<MobilePostType, 'id' | 'title' | 'image' | 'imageVariants'>;
  onClose: () => void;
  /** The location was saved; the post is live again. */
  onCorrected: () => void;
  /** The zone's upload rules — what a correct location means here. */
  rules?: string[];
};

/**
 * The author of a suspended post gives it its real location. The place the post has now is
 * the red pin; the author taps the map for the right one (teal, draggable), and saving puts
 * the post back in the feeds and re-scores every guess against it.
 */
export function CorrectLocationSheet({ post, onClose, onCorrected, rules = [] }: Props) {
  const insets = useSafeAreaInsets();
  const { isTwoPane } = useLayout();
  const cameraRef = useRef<MapboxGL.Camera>(null);

  const [coords, setCoords] = useState<[number, number] | null>(null); // [lng, lat]
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPhoto, setShowPhoto] = useState(false);
  const [showRules, setShowRules] = useState(false);

  // The author is allowed the guess map, which carries the post's current (disputed) spot.
  const { data } = useQuery({
    queryKey: ['post-guess-map', post.id],
    queryFn: () => postsApi.getGuessMap(post.id),
  });
  const current = data?.photoCoordinates ?? null;

  // The camera opens on Tbilisi; once the current spot is known, move to it — once.
  const centered = useRef(false);
  useEffect(() => {
    if (!current || centered.current) return;
    centered.current = true;
    cameraRef.current?.setCamera({
      centerCoordinate: [current.longitude, current.latitude],
      zoomLevel: mapFitMaxZoom,
      animationDuration: 600,
    });
  }, [current]);

  const handleMapPress = (e: GeoJSON.Feature<GeoJSON.Point>) => {
    if (saving) return;
    setError(null);
    setCoords(e.geometry.coordinates as [number, number]);
  };

  const save = async () => {
    if (!coords) return;
    setSaving(true);
    setError(null);
    try {
      await postsApi.correctLocation(post.id, { latitude: coords[1], longitude: coords[0] });
      onCorrected();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ლოკაციის გასწორება ვერ მოხერხდა.');
      setSaving(false);
    }
  };

  const confirmSave = () => {
    Alert.alert(
      'ლოკაციის გასწორება',
      'პოსტი ახალი ლოკაციით დაბრუნდება და ყველა გამოცნობის ქულა თავიდან გადაითვლება. გსურს გაგრძელება?',
      [
        { text: 'გაუქმება', style: 'cancel' },
        { text: 'დადასტურება', onPress: save },
      ]
    );
  };

  const buttonH = isTwoPane ? 'h-10' : 'h-12';

  const photoToggle = post.image ? (
    <Pressable
      onPress={() => setShowPhoto((v) => !v)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: showPhoto }}
      accessibilityLabel="სურათი"
      className={`${isTwoPane ? 'h-10 w-10' : 'h-12 w-12'} rounded-xl items-center justify-center border active:opacity-80 ${
        showPhoto ? 'bg-teal-500/20 border-teal-400' : 'bg-zinc-800 border-zinc-800'
      }`}
    >
      <Feather name="image" size={20} color={showPhoto ? '#5EEAD4' : Colors.onImageMuted} />
    </Pressable>
  ) : null;

  // "i" toggles the zone's rules over the map: they say where the pin belongs.
  const rulesToggle = rules.length > 0 ? (
    <Pressable
      onPress={() => setShowRules((v) => !v)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: showRules }}
      accessibilityLabel="წესები"
      className={`${isTwoPane ? 'h-10 w-10' : 'h-12 w-12'} rounded-xl items-center justify-center border active:opacity-80 ${
        showRules ? 'bg-teal-500/20 border-teal-400' : 'bg-zinc-800 border-zinc-800'
      }`}
    >
      <Feather name="info" size={20} color={showRules ? '#5EEAD4' : Colors.onImageMuted} />
    </Pressable>
  ) : null;

  const action = saving ? (
    <View className={`${buttonH} rounded-xl bg-teal-800 items-center justify-center`}>
      <ActivityIndicator color="#fff" />
    </View>
  ) : (
    <Pressable
      onPress={confirmSave}
      disabled={!coords}
      className={`${buttonH} rounded-xl flex-row items-center justify-center gap-2 active:opacity-80 ${
        coords ? 'bg-teal-600' : 'bg-teal-900'
      }`}
    >
      <Feather name="check" size={18} color={coords ? '#fff' : 'rgba(153,246,228,0.5)'} />
      <Text className={`text-base font-semibold ${coords ? 'text-white' : 'text-teal-200/50'}`}>
        გასწორება
      </Text>
    </Pressable>
  );

  return (
    // Back closes the sheet unless the save is already on its way.
    <Modal
      animationType="slide"
      presentationStyle="fullScreen"
      visible
      onRequestClose={() => { if (!saving) onClose(); }}
    >
      <View className="flex-1 bg-zinc-950">
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
            ლოკაციის გასწორება
          </Text>
          {isTwoPane ? (
            <>
              {photoToggle}
              {rulesToggle}
              <View style={{ width: 200 }}>{action}</View>
            </>
          ) : null}
          <Pressable
            onPress={onClose}
            disabled={saving}
            className="p-2 rounded-md bg-zinc-800"
            hitSlop={8}
          >
            <Feather name="x" size={18} color={Colors.onImageMuted} />
          </Pressable>
        </View>

        <View
          style={{
            flex: 1,
            flexDirection: isTwoPane ? 'row' : 'column',
            paddingLeft: insets.left,
            paddingRight: insets.right,
            paddingBottom: isTwoPane ? insets.bottom : 0,
          }}
        >
          {showPhoto && post.image ? (
            <View
              className="bg-black"
              style={isTwoPane ? { width: IMAGE_PANE_WIDTH } : { width: '100%', height: IMAGE_BAND_HEIGHT }}
            >
              <PinchZoomImage
                uri={post.image}
                placeholderUri={post.imageVariants?.feed}
                style={{ flex: 1 }}
              />
            </View>
          ) : null}

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
                defaultSettings={{ centerCoordinate: mapDefaultCenter, zoomLevel: mapOverviewZoom }}
                maxBounds={mapMaxBounds}
                maxZoomLevel={mapMaxZoom}
              />

              {/* Where the post is now – red, so it is clear which pin is being replaced */}
              {current ? (
                <MapboxGL.PointAnnotation
                  id="current-location"
                  coordinate={[current.longitude, current.latitude]}
                  anchor={MAP_PIN_ANCHOR}
                >
                  <MapPin color={mapPinColors.truth} />
                </MapboxGL.PointAnnotation>
              ) : null}

              {/* The corrected location – teal, draggable until saved */}
              {coords ? (
                <MapboxGL.PointAnnotation
                  id="new-location"
                  coordinate={coords}
                  anchor={MAP_PIN_ANCHOR}
                  draggable={!saving}
                  onDragEnd={(e: GeoJSON.Feature<GeoJSON.Point>) =>
                    setCoords(e.geometry.coordinates as [number, number])
                  }
                >
                  <MapPin color={mapPinColors.pick} />
                </MapboxGL.PointAnnotation>
              ) : null}
            </MapboxGL.MapView>

            <View className="absolute top-3 right-3 left-3 pointer-events-none items-end">
              <View className="px-3 py-1.5 rounded-lg bg-zinc-900/90">
                <Text className="text-xs text-zinc-300" style={{ fontVariant: ['tabular-nums'] }}>
                  {coords
                    ? `${coords[1].toFixed(4)}, ${coords[0].toFixed(4)}`
                    : 'მონიშნე ფოტოს ზუსტი ადგილი რუკაზე'}
                </Text>
              </View>
            </View>

            {showRules ? (
              <View className="absolute top-14 left-3 right-3">
                <ZoneRulesList rules={rules} />
              </View>
            ) : null}

            {error ? (
              <View className="absolute bottom-4 left-4 right-4">
                <View className="rounded-xl bg-rose-950 px-4 py-3">
                  <Text className="text-sm text-rose-200 text-center">{error}</Text>
                </View>
              </View>
            ) : null}
          </View>
        </View>

        {!isTwoPane ? (
          <View
            className="flex-row items-center gap-3 pt-3 bg-zinc-900 border-t border-zinc-800"
            style={{ paddingBottom: insets.bottom + 12, paddingLeft: 16 + insets.left, paddingRight: 16 + insets.right }}
          >
            {photoToggle}
            {rulesToggle}
            <View className="flex-1">{action}</View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}
