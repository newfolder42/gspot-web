import { useEffect, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Image,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import MapboxGL from '@rnmapbox/maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input } from '@/components/ui/Input';
import { submitApi, type ZoneSubmitType, type ZoneTag } from '@/lib/submit';
import { uploadToSignedUrl } from '@/lib/upload';
import { processPostPhoto } from '@/lib/image';
import { mapDefaultCenter, mapMaxBounds, mapMaxZoom } from '@/lib/map';

MapboxGL.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '');

const MAX_IMAGE_SIZE = 15 * 1024 * 1024;

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateIdempotencyKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isInGeorgia(lat: number, lng: number) {
  return lat >= 40.8 && lat <= 43.8 && lng >= 39.4 && lng <= 46.9;
}

// Parse a single rational like "41/1" → 41, or "123456/10000" → 12.3456
function parseRational(s: string): number | null {
  const [num, den] = s.trim().split('/').map(Number);
  if (!isFinite(num) || !isFinite(den) || den === 0) return null;
  return num / den;
}

// Parse a GPS coordinate value in any format Expo/Android/iOS may return:
//   number    → 41.7230
//   string    → "41.7230" | "41/1" | "41/1,42/1,1234/100"
//   array     → [41, 42, 12.34]  (DMS)
function parseDMSValue(value: unknown): number | null {
  if (typeof value === 'number' && isFinite(value)) return Math.abs(value);

  if (Array.isArray(value) && value.length >= 3) {
    const toNum = (v: unknown): number | null => {
      if (typeof v === 'number') return v;
      if (typeof v === 'string') return v.includes('/') ? parseRational(v) : parseFloat(v);
      return null;
    };
    const d = toNum(value[0]);
    const m = toNum(value[1]);
    const s = toNum(value[2]);
    if (d !== null && m !== null && s !== null && isFinite(d) && isFinite(m) && isFinite(s)) {
      return Math.abs(d + m / 60 + s / 3600);
    }
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    // Android ExifInterface: "41/1,42/1,1234/100" (comma-separated DMS rationals)
    if (trimmed.includes(',')) {
      const parts = trimmed.split(',');
      const d = parseRational(parts[0]) ?? parseFloat(parts[0]);
      const m = parseRational(parts[1] ?? '0') ?? 0;
      const s = parseRational(parts[2] ?? '0') ?? 0;
      if (isFinite(d) && isFinite(m) && isFinite(s)) return Math.abs(d + m / 60 + s / 3600);
      return null;
    }
    // Single rational "41/1" or plain decimal "41.7230"
    const result = trimmed.includes('/') ? parseRational(trimmed) : parseFloat(trimmed);
    return result !== null && isFinite(result) ? Math.abs(result) : null;
  }

  return null;
}

function extractGPSFromExif(exif: any): { latitude: number; longitude: number } | null {
  if (!exif) return null;

  if (__DEV__) {
    const allKeys = Object.keys(exif);
    console.log('[EXIF keys]', allKeys.join(' | '));
    allKeys.forEach((key) => {
      const val = (exif as Record<string, unknown>)[key];
      if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
        const nested = val as Record<string, unknown>;
        Object.keys(nested).forEach((nk) => {
          console.log(`[EXIF] ${key}.${nk} =`, JSON.stringify(nested[nk]));
        });
      } else {
        console.log(`[EXIF] ${key} =`, JSON.stringify(val));
      }
    });
  }

  // iOS: GPS data lives in exif['{GPS}'] with keys Latitude/Longitude (no "GPS" prefix)
  // Some Expo versions expose it as exif['GPS'] without braces
  const gpsBlock = exif['{GPS}'] ?? exif['GPS'] ?? null;
  if (gpsBlock) {
    let lat = parseDMSValue(gpsBlock.Latitude);
    let lng = parseDMSValue(gpsBlock.Longitude);
    if (lat !== null && lng !== null) {
      if ((gpsBlock.LatitudeRef ?? '').includes('S')) lat = -lat;
      if ((gpsBlock.LongitudeRef ?? '').includes('W')) lng = -lng;
      if (isFinite(lat) && isFinite(lng) && !(lat === 0 && lng === 0)) {
        return { latitude: lat, longitude: lng };
      }
    }
  }

  // Android / flat EXIF: GPSLatitude / GPSLongitude at top level
  let lat = parseDMSValue(exif.GPSLatitude);
  let lng = parseDMSValue(exif.GPSLongitude);
  if (lat !== null && lng !== null) {
    if ((exif.GPSLatitudeRef ?? '').includes('S')) lat = -lat;
    if ((exif.GPSLongitudeRef ?? '').includes('W')) lng = -lng;
    if (isFinite(lat) && isFinite(lng) && !(lat === 0 && lng === 0)) {
      return { latitude: lat, longitude: lng };
    }
  }

  return null;
}

function extractDateFromExif(exif: any): Date | null {
  if (!exif) return null;
  // iOS: date lives in exif['{Exif}'].DateTimeOriginal; Android: top-level
  const sub = exif['{Exif}'] ?? exif['{TIFF}'] ?? null;
  const raw: string | undefined =
    exif.DateTimeOriginal ??
    exif.DateTime ??
    exif.DateTimeDigitized ??
    sub?.DateTimeOriginal ??
    sub?.DateTime;
  if (!raw) return null;
  // EXIF date format: "2024:01:15 12:30:00" → replace colons in date portion
  const normalized = raw.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d;
}

function validateDate(d: Date | null): string | null {
  if (!d) return 'გადაღების თარიღი სავალდებულოა';
  const today = new Date();
  const dOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const tOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (dOnly > tOnly) return 'თარიღი არ უნდა იყოს მომავალში';
  if (d.getFullYear() < 2012) return 'თარიღი არ შეიძლება იყოს 2012 წელზე ადრე';
  return null;
}


// ─── MapCoordPicker ──────────────────────────────────────────────────────────

const MAP_ZOOM_DEFAULT = 12;   // City-level — shown before coords are set (no auto-zoom on tap)
const MAP_ZOOM_LOCATION = 14;  // Street-level — used only for auto-zoom (EXIF / my-location)

function MapCoordPicker({
  coords,
  onChange,
  onScrollLock,
  animateToCoordsKey,
}: {
  coords: { latitude: number; longitude: number } | null;
  onChange: (c: { latitude: number; longitude: number }) => void;
  onScrollLock: (enabled: boolean) => void;
  animateToCoordsKey?: number;
}) {
  const cameraRef = useRef<MapboxGL.Camera>(null);
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const pendingLocationRef = useRef(false);

  const hasCoords = coords != null && isFinite(coords.latitude) && isFinite(coords.longitude);
  const markerCoord: [number, number] = hasCoords
    ? [coords!.longitude, coords!.latitude]
    : mapDefaultCenter;

  // Fly to newly extracted GPS coords (e.g. from EXIF)
  useEffect(() => {
    if (!animateToCoordsKey || !coords) return;
    cameraRef.current?.setCamera({
      centerCoordinate: [coords.longitude, coords.latitude],
      zoomLevel: MAP_ZOOM_LOCATION,
      animationDuration: 1400,
      animationMode: 'flyTo',
    });
  }, [animateToCoordsKey]);

  const handlePress = (e: GeoJSON.Feature<GeoJSON.Point>) => {
    const [lng, lat] = e.geometry.coordinates;
    onChange({ latitude: lat, longitude: lng });
  };

  const handleDragEnd = (e: any) => {
    const [lng, lat] = e.geometry.coordinates;
    onChange({ latitude: lat, longitude: lng });
  };

  const handleLocationUpdate = (location: any) => {
    const lngLat: [number, number] = [location.coords.longitude, location.coords.latitude];
    setUserCoords(lngLat);
    if (pendingLocationRef.current) {
      pendingLocationRef.current = false;
      setGettingLocation(false);
      onChange({ latitude: location.coords.latitude, longitude: location.coords.longitude });
      cameraRef.current?.setCamera({
        centerCoordinate: lngLat,
        zoomLevel: MAP_ZOOM_LOCATION,
        animationDuration: 1000,
        animationMode: 'flyTo',
      });
    }
  };

  const handleMyLocation = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) return;
    }
    if (userCoords) {
      const [lng, lat] = userCoords;
      onChange({ latitude: lat, longitude: lng });
      cameraRef.current?.setCamera({
        centerCoordinate: userCoords,
        zoomLevel: MAP_ZOOM_LOCATION,
        animationDuration: 1000,
        animationMode: 'flyTo',
      });
      return;
    }
    setGettingLocation(true);
    pendingLocationRef.current = true;
    setTimeout(() => {
      if (pendingLocationRef.current) {
        pendingLocationRef.current = false;
        setGettingLocation(false);
      }
    }, 10000);
  };

  const gpsLabel = hasCoords
    ? `${coords!.latitude.toFixed(5)}, ${coords!.longitude.toFixed(5)}`
    : 'შეეხე რუკას ლოკაციის მისათითებლად';

  const inGeorgia = hasCoords && isInGeorgia(coords!.latitude, coords!.longitude);
  const outOfBoundsWarning = hasCoords && !inGeorgia;

  return (
    <View
      className="rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700"
      style={{ height: 280 }}
      onTouchStart={() => onScrollLock(false)}
      onTouchEnd={() => onScrollLock(true)}
      onTouchCancel={() => onScrollLock(true)}
    >
      <MapboxGL.MapView
        style={{ flex: 1 }}
        styleURL="mapbox://styles/mapbox/standard-satellite"
        onPress={handlePress}
        pitchEnabled={false}
        rotateEnabled={false}
        attributionEnabled={false}
        logoEnabled={false}
      >
        {/* Uncontrolled camera: only `defaultSettings` sets the initial view.
            Tapping/dragging the pin won't move the camera — auto-zoom happens
            solely via the imperative flyTo in the EXIF effect / my-location button. */}
        <MapboxGL.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: hasCoords ? markerCoord : mapDefaultCenter,
            zoomLevel: hasCoords ? MAP_ZOOM_LOCATION : MAP_ZOOM_DEFAULT,
          }}
          maxBounds={mapMaxBounds}
          maxZoomLevel={mapMaxZoom}
        />

        {/* visible={false}: no live location puck (matches web), but onUpdate still
            fires so the "my location" button can drop a pin. */}
        <MapboxGL.UserLocation visible={false} onUpdate={handleLocationUpdate} />

        {hasCoords && (
          <MapboxGL.PointAnnotation
            id="coord-pin"
            coordinate={markerCoord}
            anchor={{ x: 0.5, y: 1 }}
            draggable
            onDragEnd={handleDragEnd}
          >
            {/* Teardrop pin matching the web Mapbox marker (tip points at the spot) */}
            <View style={{ width: 28, height: 30, alignItems: 'center' }}>
              <View
                style={{
                  width: 24,
                  height: 24,
                  backgroundColor: outOfBoundsWarning ? '#ef4444' : '#14B8A6',
                  borderWidth: 2,
                  borderColor: '#fff',
                  borderTopLeftRadius: 12,
                  borderTopRightRadius: 12,
                  borderBottomLeftRadius: 12,
                  borderBottomRightRadius: 2,
                  transform: [{ rotate: '45deg' }],
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  top: 8,
                  alignSelf: 'center',
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#fff',
                }}
              />
            </View>
          </MapboxGL.PointAnnotation>
        )}
      </MapboxGL.MapView>

      {/* My location button */}
      <View className="absolute top-2 right-2">
        <Pressable
          onPress={handleMyLocation}
          disabled={gettingLocation}
          className="flex-row items-center gap-1.5 px-3 py-2 rounded-md bg-white/90 dark:bg-zinc-800/90 shadow-sm active:opacity-70"
        >
          {gettingLocation ? (
            <ActivityIndicator size="small" color="#14B8A6" />
          ) : (
            <Feather name="crosshair" size={14} color="#14B8A6" />
          )}
          <Text className="text-xs text-zinc-800 dark:text-zinc-100">ჩემი ლოკაცია</Text>
        </Pressable>
      </View>

      {/* Coords / hint label at bottom */}
      <View className="absolute bottom-2 left-2 right-2 pointer-events-none">
        <View
          className={`self-start px-2.5 py-1 rounded-lg ${outOfBoundsWarning ? 'bg-rose-900/90' : 'bg-zinc-900/85'
            }`}
        >
          <Text className={`text-xs ${outOfBoundsWarning ? 'text-rose-200' : 'text-zinc-200'}`}>
            {outOfBoundsWarning ? `${gpsLabel} — საქართველოს გარეთ` : gpsLabel}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function SubmitScreen() {
  const insets = useSafeAreaInsets();

  const [zonePickerOpen, setZonePickerOpen] = useState(false);
  const [selectedZone, setSelectedZone] = useState<ZoneSubmitType | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);

  const [title, setTitle] = useState('');
  const [dateTaken, setDateTaken] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [image, setImage] = useState<{ uri: string; name: string; type: string; size: number; width: number; height: number } | null>(null);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gpsAutoDetected, setGpsAutoDetected] = useState(false);

  const [processing, setProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [coordsAnimKey, setCoordsAnimKey] = useState(0);

  const submitIdRef = useRef<string | null>(null);

  const zonesQuery = useQuery({
    queryKey: ['submit-zones'],
    queryFn: () => submitApi.loadZones(),
  });
  const sortedZones = zonesQuery.data ?? [];

  const resetForm = () => {
    setTitle('');
    setDateTaken(null);
    setImage(null);
    setCoords(null);
    setGpsAutoDetected(false);
    setSelectedZone(null);
    setSelectedTagId(null);
    setZonePickerOpen(false);
    setError(null);
    setUploadProgress(null);
    submitIdRef.current = null;
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (submitIdRef.current) throw new Error('ატვირთვა უკვე მიმდინარეობს');
      if (!selectedZone) throw new Error('საბზონა სავალდებულოა');
      if (!image) throw new Error('ფოტო-სურათი სავალდებულოა');

      const dateErr = validateDate(dateTaken);
      if (dateErr) throw new Error(dateErr);

      if (!coords || !isFinite(coords.latitude) || !isFinite(coords.longitude)) {
        throw new Error('მონიშნე ლოკაცია რუკაზე');
      }
      if (!isInGeorgia(coords.latitude, coords.longitude)) {
        throw new Error('ლოკაცია უნდა იყოს საქართველოში');
      }

      const idempotencyKey = generateIdempotencyKey();
      submitIdRef.current = idempotencyKey;
      setError(null);
      setUploadProgress(0);

      try {
        // Downscale + JPEG re-encode on-device (longest edge ≤ 4096px) so the upload is small
        // on cellular and the stored master matches the web pipeline. The server still derives
        // the WebP feed/thumb variants.
        const processed = await processPostPhoto(image.uri, image.width, image.height, image.name);

        const signedUrl = await submitApi.createUploadUrl();
        const publicUrl = await uploadToSignedUrl(signedUrl, processed.uri, processed.type, setUploadProgress);

        const contentId = await submitApi.saveContent({
          publicUrl,
          originalFileName: processed.name,
          fileSize: processed.size,
          coordinates: coords,
          dateTaken: dateTaken!.toISOString(),
        });

        const postId = await submitApi.createPost({
          title: title.trim(),
          contentId,
          zoneId: selectedZone.id,
          zoneSlug: selectedZone.slug,
          idempotencyKey,
          tagId: selectedTagId,
        });

        return postId;
      } finally {
        submitIdRef.current = null;
        setUploadProgress(null);
      }
    },
    onSuccess: (postId) => {
      Alert.alert('წარმატება', 'პოსტი წარმატებით აიტვირთა', [
        { text: 'კარგი', onPress: resetForm },
      ]);
      if (__DEV__) console.log('[Submit] created post', postId);
    },
    onError: (err) => {
      setError((err as Error).message);
    },
  });

  const pickImage = async (source: 'library' | 'camera') => {
    setError(null);
    setGpsAutoDetected(false);

    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('წვდომა საჭიროა', 'კამერაზე წვდომა საჭიროა ფოტოს გადასაღებად.');
        return;
      }
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('წვდომა საჭიროა', 'გალერეაზე წვდომა საჭიროა ფოტოს ასარჩევად.');
        return;
      }
    }

    // ACCESS_MEDIA_LOCATION is auto-granted alongside READ_MEDIA_IMAGES on Android 10+.
    // No runtime request needed — only the manifest declaration matters.

    setProcessing(true);
    try {
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1, exif: true })
          : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: false,
            quality: 1,
            exif: true,
          });

      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset.uri) return;

      const size = asset.fileSize ?? 0;
      if (size > MAX_IMAGE_SIZE) {
        Alert.alert('ფაილი ძალიან დიდია', 'ფაილის ზომა არ უნდა აღემატებოდეს 15 მბს.');
        return;
      }

      setImage({
        uri: asset.uri,
        name: asset.fileName ?? `upload-${Date.now()}.jpg`,
        type: asset.mimeType ?? 'image/jpeg',
        size,
        width: asset.width ?? 0,
        height: asset.height ?? 0,
      });

      let gps: { latitude: number; longitude: number } | null = null;

      // Android: MediaStore strips GPS from content URIs. Use getAssetInfoAsync() which
      // reads the original file metadata using ACCESS_MEDIA_LOCATION (must be in manifest).
      // NOTE: if the user picked with "limited access" Android will still return null.
      if (Platform.OS === 'android' && source === 'library' && asset.assetId) {
        try {
          const info = await MediaLibrary.getAssetInfoAsync(asset.assetId, {
            shouldDownloadFromNetwork: false,
          });
          if (__DEV__) console.log('[GPS] getAssetInfoAsync location =', JSON.stringify(info?.location));
          if (info?.location) {
            gps = { latitude: info.location.latitude, longitude: info.location.longitude };
          }
        } catch (e) {
          if (__DEV__) console.warn('[GPS] getAssetInfoAsync failed:', e);
        }
      }

      // Camera captures and iOS: GPS is intact in EXIF
      if (!gps) gps = extractGPSFromExif((asset as any).exif);

      if (gps) {
        setCoords(gps);
        setGpsAutoDetected(true);
        setCoordsAnimKey((k) => k + 1);
      }

      const exifDate = extractDateFromExif((asset as any).exif);
      if (exifDate) setDateTaken(exifDate);
    } finally {
      setProcessing(false);
    }
  };

  const handlePickOptions = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['გაუქმება', 'გალერეიდან', 'კამერით გადაღება'], cancelButtonIndex: 0 },
        (idx) => {
          if (idx === 1) pickImage('library');
          if (idx === 2) pickImage('camera');
        }
      );
    } else {
      Alert.alert('ფოტოს არჩევა', undefined, [
        { text: 'გალერეიდან', onPress: () => pickImage('library') },
        { text: 'კამერით გადაღება', onPress: () => pickImage('camera') },
        { text: 'გაუქმება', style: 'cancel' },
      ]);
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────────

  const isPending = submitMutation.isPending;
  const dateErr = validateDate(dateTaken);
  const hasCoords = coords != null && isFinite(coords.latitude) && isFinite(coords.longitude);
  const inGeorgia = hasCoords && isInGeorgia(coords!.latitude, coords!.longitude);
  const canSubmit = !isPending && selectedZone != null && image != null && dateErr == null && hasCoords && inGeorgia;

  // ── Loading / Error states ─────────────────────────────────────────────────

  if (zonesQuery.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <ActivityIndicator size="large" color="#14B8A6" />
      </View>
    );
  }

  if (zonesQuery.isError) {
    return (
      <View className="flex-1 items-center justify-center px-8 bg-zinc-50 dark:bg-zinc-950">
        <Text className="text-zinc-500 dark:text-zinc-400 text-sm text-center mb-4">
          ფორმის ჩატვირთვა ვერ მოხერხდა
        </Text>
        <Pressable
          onPress={() => zonesQuery.refetch()}
          className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800"
        >
          <Text className="text-teal-600 dark:text-teal-400 text-sm font-semibold">ხელახლა ცდა</Text>
        </Pressable>
      </View>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <ScrollView
      className="flex-1 bg-zinc-50 dark:bg-zinc-950"
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: insets.bottom + 32 }}
      keyboardShouldPersistTaps="handled"
      scrollEnabled={scrollEnabled}
    >
      <Text className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-5">ახალი პოსტი</Text>

      {/* ── Zone picker ─────────────────────────────────── */}
      <View className="mb-4">
        <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
          საბზონა <Text className="text-rose-500">*</Text>
        </Text>
        <Pressable
          onPress={() => setZonePickerOpen((v) => !v)}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3.5 flex-row items-center justify-between"
        >
          <Text className={selectedZone ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-500'}>
            {selectedZone ? selectedZone.slug : 'აირჩიე საბზონა'}
          </Text>
          <Feather name={zonePickerOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#71717A" />
        </Pressable>

        {zonePickerOpen ? (
          <View className="mt-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden">
            {sortedZones.length === 0 ? (
              <View className="px-4 py-3">
                <Text className="text-sm text-zinc-400">შენ არ ხარ არცერთი საბზონის წევრი</Text>
              </View>
            ) : (
              sortedZones.map((zone) => (
                <Pressable
                  key={zone.id}
                  onPress={() => {
                    setSelectedZone(zone);
                    setSelectedTagId(null);
                    setZonePickerOpen(false);
                  }}
                  className={`px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 active:opacity-70 ${zone.id === selectedZone?.id ? 'bg-teal-50 dark:bg-teal-950' : ''
                    }`}
                >
                  <Text
                    className={`text-sm ${zone.id === selectedZone?.id
                      ? 'font-semibold text-teal-700 dark:text-teal-300'
                      : 'text-zinc-800 dark:text-zinc-200'
                      }`}
                  >
                    {zone.slug}
                  </Text>
                  {zone.description ? (
                    <Text className="text-xs text-zinc-400 mt-0.5">{zone.description}</Text>
                  ) : null}
                </Pressable>
              ))
            )}
          </View>
        ) : null}
      </View>

      {/* ── Title ───────────────────────────────────────── */}
      <Input
        label="სათაური"
        placeholder="მაგ: ძველი ეკლესია კახეთში"
        value={title}
        onChangeText={setTitle}
        maxLength={250}
      />

      {/* ── Date taken ──────────────────────────────────── */}
      <View className="mb-4">
        <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
          გადაღებულია <Text className="text-rose-500">*</Text>
        </Text>

        {Platform.OS === 'ios' ? (
          <View className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2">
            <DateTimePicker
              value={dateTaken ?? new Date()}
              mode="date"
              display="compact"
              maximumDate={new Date()}
              minimumDate={new Date('2012-01-01')}
              style={{ alignSelf: 'flex-start' }}
              onValueChange={(_, date) => {
                if (date) setDateTaken(date);
              }}
            />
          </View>
        ) : (
          <>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3.5 flex-row items-center justify-between"
            >
              <Text className={dateTaken ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-500'}>
                {dateTaken ? dateTaken.toISOString().split('T')[0] : 'თარიღის არჩევა'}
              </Text>
              <Feather name="calendar" size={18} color="#71717A" />
            </Pressable>
            {showDatePicker ? (
              <DateTimePicker
                value={dateTaken ?? new Date()}
                mode="date"
                display="default"
                maximumDate={new Date()}
                minimumDate={new Date('2012-01-01')}
                onValueChange={(_, date) => {
                  setShowDatePicker(false);
                  if (date) setDateTaken(date);
                }}
                onDismiss={() => setShowDatePicker(false)}
              />
            ) : null}
          </>
        )}

        {dateTaken && dateErr ? (
          <Text className="text-xs text-rose-500 mt-1 ml-1">{dateErr}</Text>
        ) : null}
      </View>

      {/* ── Tags ────────────────────────────────────────── */}
      {selectedZone?.tags?.length ? (
        <View className="mb-4">
          <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">თეგი</Text>
          <View className="flex-row flex-wrap gap-2">
            {selectedZone.tags.map((tag: ZoneTag) => {
              const active = tag.id === selectedTagId;
              return (
                <Pressable
                  key={tag.id}
                  onPress={() => setSelectedTagId((prev) => (prev === tag.id ? null : tag.id))}
                  style={active ? { backgroundColor: tag.color, borderColor: tag.color } : undefined}
                  className={`px-3 py-1.5 rounded-full border ${active ? '' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700'
                    }`}
                >
                  <Text
                    className={`text-xs font-medium ${active ? 'text-white' : 'text-zinc-700 dark:text-zinc-300'}`}
                  >
                    {tag.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* ── Image section ────────────────────────────────── */}
      {!image ? (
        processing ? (
          <View className="rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-10 items-center mb-4">
            <ActivityIndicator size="large" color="#14B8A6" />
            <Text className="mt-3 text-sm font-medium text-zinc-800 dark:text-zinc-200">ფოტოს დამუშავება...</Text>
            <Text className="text-xs text-zinc-400 mt-1">GPS და თარიღის ამოღება EXIF-იდან</Text>
          </View>
        ) : (
          <Pressable
            onPress={handlePickOptions}
            className="rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-10 items-center mb-4 active:opacity-70"
          >
            <Feather name="camera" size={28} color="#71717A" />
            <Text className="mt-3 text-sm font-medium text-zinc-800 dark:text-zinc-200">
              ფოტოს არჩევა ან გადაღება
            </Text>
            <Text className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">JPEG / WebP / PNG · მაქს 15 MB</Text>
          </Pressable>
        )
      ) : (
        <>
          {/* Map coord picker */}
          <View className="mb-3">
            <View className="flex-row items-center justify-between mb-1.5">
              <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                ლოკაცია <Text className="text-rose-500">*</Text>
              </Text>
              {gpsAutoDetected && coords ? (
                <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950 border border-teal-200 dark:border-teal-800">
                  <Feather name="check-circle" size={11} color="#14B8A6" />
                  <Text className="text-xs text-teal-700 dark:text-teal-300">GPS ფოტოდან</Text>
                </View>
              ) : !coords ? (
                <Text className="text-xs text-zinc-400">შეეხე რუკას პინის დასაყენებლად</Text>
              ) : null}
            </View>
            <MapCoordPicker
              coords={coords}
              onChange={(c) => { setCoords(c); setGpsAutoDetected(false); }}
              onScrollLock={setScrollEnabled}
              animateToCoordsKey={coordsAnimKey}
            />
          </View>

          {/* Image thumbnail + replace */}
          <View className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-950 overflow-hidden mb-4">
            <Image
              source={{ uri: image.uri }}
              style={{ width: '100%', height: 240 }}
              resizeMode="contain"
            />
            <View className="px-3 py-2.5 flex-row items-center justify-between bg-zinc-900 border-t border-zinc-800">
              <Text className="text-xs text-zinc-400 flex-1 mr-3" numberOfLines={1}>
                {image.name}
              </Text>
              <Pressable
                onPress={() => {
                  setImage(null);
                  setCoords(null);
                  setGpsAutoDetected(false);
                  setDateTaken(null);
                }}
                hitSlop={8}
              >
                <Text className="text-xs text-rose-400">ფოტოს ცვლილება</Text>
              </Pressable>
            </View>
          </View>
        </>
      )}

      {/* ── Zone rules ──────────────────────────────────── */}
      {selectedZone?.settings?.upload_rules?.length ? (
        <View className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 mb-5">
          <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-2">წესები</Text>
          {selectedZone.settings.upload_rules.map((rule, idx) => (
            <Text key={idx} className="text-sm text-zinc-600 dark:text-zinc-300 leading-5 mb-1">
              {idx + 1}. {rule}
            </Text>
          ))}
        </View>
      ) : null}

      {/* ── Upload progress ──────────────────────────────── */}
      {uploadProgress !== null ? (
        <View className="mb-4">
          <View className="flex-row items-center justify-between mb-1.5">
            <Text className="text-xs text-zinc-500 dark:text-zinc-400">ატვირთვა...</Text>
            <Text className="text-xs font-semibold text-teal-600 dark:text-teal-400">{uploadProgress}%</Text>
          </View>
          <View className="w-full h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
            <View
              className="h-2 rounded-full bg-teal-500"
              style={{ width: `${uploadProgress}%` }}
            />
          </View>
        </View>
      ) : null}

      {/* ── Inline error ─────────────────────────────────── */}
      {error ? (
        <View className="mb-4 px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-950 border border-rose-200 dark:border-rose-800">
          <Text className="text-sm text-rose-700 dark:text-rose-300">{error}</Text>
        </View>
      ) : null}

      {/* ── Submit button ────────────────────────────────── */}
      <Pressable
        onPress={() => submitMutation.mutate()}
        disabled={!canSubmit}
        style={{ opacity: canSubmit ? 1 : 0.45 }}
        className="h-12 rounded-xl bg-teal-600 items-center justify-center active:opacity-80"
      >
        {isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-base font-semibold text-white">ატვირთვა</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
