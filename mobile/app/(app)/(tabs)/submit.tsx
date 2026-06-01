import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { submitApi, type ZoneSubmitType, type ZoneTag } from '@/lib/submit';

const MAX_IMAGE_SIZE = 15 * 1024 * 1024;

function generateIdempotencyKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function toIsoDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (Number.isNaN(date.getTime())) return null;
  if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) return null;

  return date.toISOString();
}

function isInGeorgia(latitude: number, longitude: number) {
  return latitude >= 40.8 && latitude <= 43.8 && longitude >= 39.4 && longitude <= 46.9;
}

/**
 * Parse a GPS degree value that may be a decimal number, a string, or a
 * [degrees, minutes, seconds] array (DMS) as returned by some EXIF parsers.
 */
function parseDMS(value: unknown): number | null {
  if (typeof value === 'number' && isFinite(value)) return Math.abs(value);
  if (typeof value === 'string') {
    const n = parseFloat(value);
    return isFinite(n) ? Math.abs(n) : null;
  }
  if (Array.isArray(value) && value.length >= 3) {
    const d = Number(value[0]);
    const m = Number(value[1]);
    const s = Number(value[2]);
    if (isFinite(d) && isFinite(m) && isFinite(s)) return d + m / 60 + s / 3600;
  }
  return null;
}

function extractGPSFromExif(exif: any): { latitude: number; longitude: number } | null {
  if (!exif) return null;

  let lat = parseDMS(exif.GPSLatitude);
  let lng = parseDMS(exif.GPSLongitude);

  if (lat === null || lng === null) return null;

  // Apply hemisphere refs (N/S, E/W)
  const latRef: string = exif.GPSLatitudeRef ?? '';
  const lngRef: string = exif.GPSLongitudeRef ?? '';
  if (latRef.includes('S')) lat = -lat;
  if (lngRef.includes('W')) lng = -lng;

  if (!isFinite(lat) || !isFinite(lng) || (lat === 0 && lng === 0)) return null;
  return { latitude: lat, longitude: lng };
}

async function uploadToSignedUrl(signedUrl: string, uri: string, mimeType: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', signedUrl);
    xhr.setRequestHeader('Content-Type', mimeType || 'application/octet-stream');
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error('ატვირთვა ვერ მოხერხდა'));
    };
    xhr.onerror = () => reject(new Error('ატვირთვა ვერ მოხერხდა'));
    xhr.send(blob);
  });

  return signedUrl.split('?')[0];
}

export default function SubmitScreen() {
  const [zonePickerOpen, setZonePickerOpen] = useState(false);
  const [selectedZone, setSelectedZone] = useState<ZoneSubmitType | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);

  const [title, setTitle] = useState('');
  const [dateTaken, setDateTaken] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [image, setImage] = useState<{ uri: string; name: string; type: string; size: number } | null>(null);

  const [submitting, setSubmitting] = useState(false);

  const zonesQuery = useQuery({
    queryKey: ['submit-zones'],
    queryFn: () => submitApi.loadZones(),
  });

  const sortedZones = useMemo(() => zonesQuery.data ?? [], [zonesQuery.data]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!selectedZone) throw new Error('საბზონა სავალდებულოა');
      if (!image) throw new Error('ფოტო-სურათი სავალდებულოა');

      const parsedDateIso = dateTaken.toISOString();

      const lat = Number(latitude);
      const lng = Number(longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new Error('GPS კოორდინატები სავალდებულოა');
      }

      if (!isInGeorgia(lat, lng)) {
        throw new Error('ლოკაცია უნდა იყოს საქართველოში');
      }

      const signedUrl = await submitApi.createUploadUrl();
      const publicUrl = await uploadToSignedUrl(signedUrl, image.uri, image.type);

      const contentId = await submitApi.saveContent({
        publicUrl,
        originalFileName: image.name,
        fileSize: image.size,
        coordinates: { latitude: lat, longitude: lng },
        dateTaken: parsedDateIso,
      });

      const postId = await submitApi.createPost({
        title: title.trim(),
        contentId,
        zoneId: selectedZone.id,
        zoneSlug: selectedZone.slug,
        idempotencyKey: generateIdempotencyKey(),
        tagId: selectedTagId,
      });

      return postId;
    },
  });

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('წვდომა საჭიროა', 'გალერეაზე წვდომის გარეშე ფოტოს ვერ ატვირთავ.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
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
      Alert.alert('შეცდომა', 'ფაილის ზომა არ უნდა აღემატებოდეს 15 მბს');
      return;
    }

    const name = asset.fileName ?? `upload-${Date.now()}.jpg`;
    const type = asset.mimeType ?? 'image/jpeg';

    setImage({
      uri: asset.uri,
      name,
      type,
      size,
    });

    const gps = extractGPSFromExif((asset as any).exif);
    if (gps) {
      setLatitude(String(gps.latitude));
      setLongitude(String(gps.longitude));
    }
  };

  const onSubmit = async () => {
    try {
      setSubmitting(true);
      const postId = await submitMutation.mutateAsync();
      Alert.alert('წარმატება', 'პოსტი წარმატებით აიტვირთა', [
        {
          text: 'კარგი',
          onPress: () => {
            setTitle('');
            setDateTaken(new Date());
            setLatitude('');
            setLongitude('');
            setImage(null);
            setSelectedTagId(null);
          },
        },
      ]);

      if (__DEV__) {
        console.log('[Submit] created post', postId);
      }
    } catch (err) {
      Alert.alert('შეცდომა', (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

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
        <Text className="text-zinc-500 dark:text-zinc-400 text-sm text-center mb-4">ფორმის ჩატვირთვა ვერ მოხერხდა</Text>
        <Pressable onPress={() => zonesQuery.refetch()} className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
          <Text className="text-brand text-sm font-semibold">ხელახლა ცდა</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-zinc-50 dark:bg-zinc-950" contentContainerClassName="px-4 py-4 pb-10">
      <Text className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">ახალი პოსტის შექმნა</Text>

      <View className="mb-4">
        <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">საბზონა</Text>
        <Pressable
          onPress={() => setZonePickerOpen((v) => !v)}
          className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3.5 flex-row items-center justify-between"
        >
          <Text className="text-zinc-900 dark:text-zinc-100">{selectedZone ? selectedZone.slug : 'აირჩიე საბზონა'}</Text>
          <Feather name={zonePickerOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#71717A" />
        </Pressable>

        {zonePickerOpen && (
          <View className="mt-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden">
            {sortedZones.map((zone) => (
              <Pressable
                key={zone.id}
                onPress={() => {
                  setSelectedZone(zone);
                  setSelectedTagId(null);
                  setZonePickerOpen(false);
                }}
                className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800"
              >
                <Text className="text-sm text-zinc-800 dark:text-zinc-200">{zone.slug}</Text>
                {zone.description ? <Text className="text-xs text-zinc-500 mt-0.5">{zone.description}</Text> : null}
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <Input label="სათაური" placeholder="მაგ: ძველი ეკლესია კახეთში" value={title} onChangeText={setTitle} maxLength={250} />
      <View className="mb-4">
        <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">გადაღებულია</Text>
        {Platform.OS === 'ios' ? (
          <DateTimePicker
            value={dateTaken}
            mode="date"
            display="compact"
            maximumDate={new Date()}
            style={{ alignSelf: 'flex-start' }}
            onChange={(_, date) => { if (date) setDateTaken(date); }}
          />
        ) : (
          <>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3.5 flex-row items-center justify-between"
            >
              <Text className="text-zinc-900 dark:text-zinc-100">
                {dateTaken.toISOString().split('T')[0]}
              </Text>
              <Feather name="calendar" size={18} color="#71717A" />
            </Pressable>
            {showDatePicker && (
              <DateTimePicker
                value={dateTaken}
                mode="date"
                display="default"
                maximumDate={new Date()}
                onChange={(_, date) => {
                  setShowDatePicker(false);
                  if (date) setDateTaken(date);
                }}
              />
            )}
          </>
        )}
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Input label="განედი" placeholder="41.7151" value={latitude} onChangeText={setLatitude} keyboardType="numeric" autoCapitalize="none" />
        </View>
        <View className="flex-1">
          <Input label="გრძედი" placeholder="44.8271" value={longitude} onChangeText={setLongitude} keyboardType="numeric" autoCapitalize="none" />
        </View>
      </View>

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
                  className={`px-3 py-2 rounded-full border ${active ? 'bg-teal-600 border-teal-600' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700'}`}
                >
                  <Text className={`text-xs ${active ? 'text-white' : 'text-zinc-700 dark:text-zinc-300'}`}>{tag.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      <Pressable
        onPress={pickImage}
        className="rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-8 items-center mb-4"
      >
        <Feather name="upload" size={22} color="#71717A" />
        <Text className="mt-2 text-sm text-zinc-800 dark:text-zinc-200">აირჩიე ან გადაიღე ფოტო</Text>
        <Text className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">WebP/JPEG/PNG, მაქს 15MB</Text>
      </Pressable>

      {image ? (
        <View className="mb-4 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden bg-black">
          <Image source={{ uri: image.uri }} className="w-full h-72" resizeMode="contain" />
          <View className="px-3 py-2 bg-zinc-950">
            <Text className="text-xs text-zinc-300">{image.name}</Text>
          </View>
        </View>
      ) : null}

      {selectedZone?.settings?.upload_rules?.length ? (
        <View className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 mb-5">
          <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-2">წესები</Text>
          {selectedZone.settings.upload_rules.map((rule, idx) => (
            <Text key={`${idx}-${rule}`} className="text-sm text-zinc-600 dark:text-zinc-300 mb-1.5">
              {idx + 1}. {rule}
            </Text>
          ))}
        </View>
      ) : null}

      <Button title="ატვირთვა" onPress={onSubmit} loading={submitting || submitMutation.isPending} disabled={submitting || submitMutation.isPending} />

      <View className="h-8" />
    </ScrollView>
  );
}
