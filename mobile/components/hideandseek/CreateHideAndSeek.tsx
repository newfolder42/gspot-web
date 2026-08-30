import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { hideAndSeekApi } from '@/lib/hideAndSeek';
import { submitApi } from '@/lib/submit';
import { getLiveLocation } from '@/lib/location';
import { mapDefaultCenter, mapMaxBounds, mapMaxZoom } from '@/lib/map';
import {
  DEFAULT_CHECKS,
  DEFAULT_DURATION_MINUTES,
  DURATION_OPTIONS,
  MAX_CHECKS,
  MIN_CHECKS,
  formatMinutes,
} from '@/types/hide-and-seek';
import { Colors, useTheme } from '@/constants/colors';

MapboxGL.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '');

function Pin() {
  return (
    <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.brand, borderWidth: 3, borderColor: '#fff' }} />
  );
}

/**
 * The create-a-game form, embedded in the submit tabs and reachable on its own route.
 * Renders a plain View so the host screen owns the scrolling.
 */
export function CreateHideAndSeek({ onCreated }: { onCreated?: () => void } = {}) {
  const theme = useTheme();
  const router = useRouter();
  const cameraRef = useRef<MapboxGL.Camera>(null);

  const [title, setTitle] = useState('');
  const [coords, setCoords] = useState<[number, number]>(mapDefaultCenter); // [lng, lat]
  const [durationMinutes, setDurationMinutes] = useState(DEFAULT_DURATION_MINUTES);
  const [maxChecks, setMaxChecks] = useState(String(DEFAULT_CHECKS));
  const [zoneIndex, setZoneIndex] = useState(0);
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [inviteInput, setInviteInput] = useState('');
  const [invitees, setInvitees] = useState<string[]>([]);
  const [resolving, setResolving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);

  const zonesQuery = useQuery({ queryKey: ['submit-zones'], queryFn: () => submitApi.loadZones() });
  const activeQuery = useQuery({
    queryKey: ['hide-and-seek', 'active'],
    queryFn: () => hideAndSeekApi.getActive(),
  });
  const zones = useMemo(() => zonesQuery.data ?? [], [zonesQuery.data]);
  const zone = zones[zoneIndex] ?? null;

  const useCurrentLocation = async () => {
    setLocating(true);
    try {
      const position = await getLiveLocation();
      if (!position) {
        Alert.alert('მდებარეობა', 'მდებარეობა ვერ დადგინდა. ჩართე ლოკაცია და სცადე თავიდან.');
        return;
      }
      const next: [number, number] = [position.longitude, position.latitude];
      setCoords(next);
      cameraRef.current?.setCamera({ centerCoordinate: next, zoomLevel: 15, animationDuration: 600 });
    } finally {
      setLocating(false);
    }
  };

  const addInvitee = async () => {
    const candidate = inviteInput.trim().toLowerCase();
    if (!candidate || resolving) return;
    if (invitees.includes(candidate)) {
      setInviteInput('');
      return;
    }

    setResolving(true);
    const exists = await hideAndSeekApi.aliasExists(candidate);
    setResolving(false);

    if (!exists) {
      Alert.alert('მოწვევა', `'${candidate} ვერ მოიძებნა.`);
      return;
    }

    setInvitees((prev) => [...prev, candidate]);
    setInviteInput('');
  };

  const submit = async () => {
    if (submitting) return;

    const checks = Number(maxChecks);
    if (!title.trim()) {
      Alert.alert('სათაური', 'სათაური აუცილებელია.');
      return;
    }
    if (!zone) {
      Alert.alert('საბზონა', 'აირჩიე საბზონა.');
      return;
    }
    if (!Number.isInteger(checks) || checks < MIN_CHECKS || checks > MAX_CHECKS) {
      Alert.alert('მცდელობები', `მცდელობების რაოდენობა ${MIN_CHECKS}-დან ${MAX_CHECKS}-მდე უნდა იყოს.`);
      return;
    }

    setSubmitting(true);
    try {
      const result = await hideAndSeekApi.create({
        title: title.trim(),
        coordinates: { latitude: coords[1], longitude: coords[0] },
        durationMinutes,
        maxChecks: checks,
        zoneId: zone.id,
        zoneSlug: zone.slug,
        visibility,
        inviteeAliases: visibility === 'private' ? invitees : [],
      });

      onCreated?.();
      router.replace({ pathname: '/(app)/post/[id]', params: { id: String(result.postId) } });
    } catch (err) {
      Alert.alert('ვერ შეიქმნა', err instanceof Error ? err.message : 'სცადე თავიდან.');
    } finally {
      setSubmitting(false);
    }
  };

  // One active game per user, so there is nothing to create until the current one is over.
  const activeGame = activeQuery.data;
  if (activeGame) {
    return (
      <View className="items-center gap-3 py-8">
        <Text className="text-lg font-bold" style={{ color: theme.text }}>უკვე ერთ დამალობანაში ხარ</Text>
        <Text className="text-sm text-center" style={{ color: theme.textMuted }}>
          ახლის დაწყებამდე მიმდინარე თამაში უნდა დასრულდეს.
        </Text>
        <Pressable
          onPress={() => router.push({ pathname: '/(app)/post/[id]', params: { id: String(activeGame.postId) } })}
          className="rounded-md px-4 py-2"
          style={{ backgroundColor: Colors.brand }}
        >
          <Text className="text-sm font-bold" style={{ color: Colors.onAccent }}>მიმდინარე თამაშზე გადასვლა</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="gap-5">
      <View className="gap-1.5">
        <Text className="text-sm font-semibold" style={{ color: theme.text }}>სათაური</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          maxLength={200}
          placeholder="მაგ. ჩემს საყვარელ ბარში, ხიდის ქვეშ"
          placeholderTextColor={theme.iconFaint}
          className="rounded-md px-3 py-2.5 text-sm"
          style={{ borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, color: theme.text }}
        />
      </View>

      <View className="gap-2">
        <Text className="text-sm font-semibold" style={{ color: theme.text }}>სამალავი ადგილი</Text>
        <View className="rounded-lg overflow-hidden" style={{ height: 260 }}>
          <MapboxGL.MapView
            style={{ flex: 1 }}
            styleURL="mapbox://styles/mapbox/standard-satellite"
            onPress={(e) => setCoords((e as any).geometry.coordinates as [number, number])}
          >
            <MapboxGL.Camera
              ref={cameraRef}
              defaultSettings={{ centerCoordinate: mapDefaultCenter, zoomLevel: 12 }}
              maxBounds={mapMaxBounds}
              maxZoomLevel={mapMaxZoom}
            />
            <MapboxGL.MarkerView coordinate={coords} anchor={{ x: 0.5, y: 0.5 }}>
              <Pin />
            </MapboxGL.MarkerView>
          </MapboxGL.MapView>
        </View>

        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={useCurrentLocation}
            disabled={locating}
            className="flex-row items-center gap-1.5 rounded-md px-2.5 py-1.5"
            style={{ borderWidth: 1, borderColor: theme.border, opacity: locating ? 0.5 : 1 }}
          >
            {locating ? (
              <ActivityIndicator size="small" color={theme.icon} />
            ) : (
              <Feather name="map-pin" size={14} color={theme.icon} />
            )}
            <Text className="text-sm font-medium" style={{ color: theme.text }}>ჩემი მდებარეობა</Text>
          </Pressable>
          <Text className="text-xs" style={{ color: theme.textMuted }}>
            {coords[1].toFixed(5)}, {coords[0].toFixed(5)}
          </Text>
        </View>

        <Text className="text-xs" style={{ color: theme.textMuted }}>
          ლოკაცია თამაშის ბოლომდე დამალულია და ცვლილებას არ ექვემდებარება.
        </Text>
      </View>

      <View className="gap-2">
        <Text className="text-sm font-semibold" style={{ color: theme.text }}>ხანგრძლივობა</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {DURATION_OPTIONS.map((m) => {
            const selected = m === durationMinutes;
            return (
              <Pressable
                key={m}
                onPress={() => setDurationMinutes(m)}
                className="rounded-md px-3 py-2"
                style={{
                  borderWidth: 1,
                  borderColor: selected ? Colors.brand : theme.border,
                  backgroundColor: selected ? Colors.brand : theme.surface,
                }}
              >
                <Text className="text-sm font-medium" style={{ color: selected ? Colors.onAccent : theme.text }}>
                  {formatMinutes(m)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View className="gap-1.5">
        <Text className="text-sm font-semibold" style={{ color: theme.text }}>მოთამაში მცდელობების რაოდენობა</Text>
        <TextInput
          value={maxChecks}
          onChangeText={setMaxChecks}
          keyboardType="number-pad"
          className="rounded-md px-3 py-2.5 text-sm"
          style={{ borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, color: theme.text }}
        />
        <Text className="text-xs" style={{ color: theme.textMuted }}>
          {MIN_CHECKS}-დან {MAX_CHECKS}-მდე.
        </Text>
      </View>

      <View className="gap-2">
        <Text className="text-sm font-semibold" style={{ color: theme.text }}>საბზონა</Text>
        {zonesQuery.isLoading ? (
          <ActivityIndicator size="small" color={Colors.brand} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {zones.map((z, i) => {
              const selected = i === zoneIndex;
              return (
                <Pressable
                  key={z.id}
                  onPress={() => setZoneIndex(i)}
                  className="rounded-md px-3 py-2"
                  style={{
                    borderWidth: 1,
                    borderColor: selected ? Colors.brand : theme.border,
                    backgroundColor: selected ? Colors.brand : theme.surface,
                  }}
                >
                  <Text className="text-sm font-medium" style={{ color: selected ? Colors.onAccent : theme.text }}>
                    {z.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>

      <View className="gap-2">
        <Text className="text-sm font-semibold" style={{ color: theme.text }}>ვის შეუძლია თამაში</Text>
        <View className="flex-row gap-2">
          {(['public', 'private'] as const).map((v) => {
            const selected = v === visibility;
            return (
              <Pressable
                key={v}
                onPress={() => setVisibility(v)}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-md px-3 py-2.5"
                style={{
                  borderWidth: 1,
                  borderColor: selected ? Colors.brand : theme.border,
                  backgroundColor: selected ? Colors.brand : theme.surface,
                }}
              >
                <Feather
                  name={v === 'public' ? 'users' : 'lock'}
                  size={14}
                  color={selected ? Colors.onAccent : theme.icon}
                />
                <Text className="text-sm font-medium" style={{ color: selected ? Colors.onAccent : theme.text }}>
                  {v === 'public' ? 'ყველას' : 'მოწვეულებს'}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {visibility === 'private' && (
          <View className="gap-2 pt-1">
            <Text className="text-sm" style={{ color: theme.textMuted }}>მოსაწვევები</Text>
            <View className="flex-row gap-2">
              <TextInput
                value={inviteInput}
                onChangeText={setInviteInput}
                onSubmitEditing={addInvitee}
                autoCapitalize="none"
                placeholder="თიკუნი"
                placeholderTextColor={theme.iconFaint}
                className="flex-1 rounded-md px-3 py-2.5 text-sm"
                style={{ borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, color: theme.text }}
              />
              <Pressable
                onPress={addInvitee}
                disabled={resolving || !inviteInput.trim()}
                className="rounded-md px-3 py-2.5 justify-center"
                style={{ borderWidth: 1, borderColor: theme.border, opacity: resolving || !inviteInput.trim() ? 0.5 : 1 }}
              >
                {resolving ? (
                  <ActivityIndicator size="small" color={theme.icon} />
                ) : (
                  <Text className="text-sm font-medium" style={{ color: theme.text }}>დამატება</Text>
                )}
              </Pressable>
            </View>

            {invitees.length > 0 && (
              <View className="flex-row flex-wrap gap-1.5">
                {invitees.map((a) => (
                  <Pressable
                    key={a}
                    onPress={() => setInvitees((prev) => prev.filter((x) => x !== a))}
                    className="flex-row items-center gap-1 rounded-full px-2.5 py-1"
                    style={{ backgroundColor: theme.surfaceAlt }}
                  >
                    <Text className="text-xs font-medium" style={{ color: theme.text }}>{a}</Text>
                    <Feather name="x" size={11} color={theme.icon} />
                  </Pressable>
                ))}
              </View>
            )}

            <Text className="text-xs" style={{ color: theme.textMuted }}>
              {invitees.length === 0
                ? 'თუ არავის მოიწვევ, თამაშს მხოლოდ შენ დაინახავ.'
                : 'მხოლოდ მოწვეულები ნახავენ ამ თამაშს.'}
            </Text>
          </View>
        )}
      </View>

      <Pressable
        onPress={submit}
        disabled={submitting}
        className="rounded-md px-4 py-3 items-center flex-row justify-center gap-2"
        style={{ backgroundColor: Colors.brand, opacity: submitting ? 0.5 : 1 }}
      >
        {submitting && <ActivityIndicator size="small" color={Colors.onAccent} />}
        <Text className="text-sm font-bold" style={{ color: Colors.onAccent }}>დაწყება</Text>
      </Pressable>
    </View>
  );
}
