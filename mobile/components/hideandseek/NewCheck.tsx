import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { hideAndSeekApi } from '@/lib/hideAndSeek';
import { getLiveLocation } from '@/lib/location';
import { formatDistance } from '@/types/hide-and-seek';
import type { HideAndSeekCheckResultType } from '@/types/hide-and-seek';
import { Colors, useTheme } from '@/constants/colors';

type Props = {
  postId: number;
  checksRemaining: number;
  onSubmitted?: (result: HideAndSeekCheckResultType) => void;
};

/**
 * Take a photo where you are, and the server tells you how far off you are. The position
 * comes from the device at capture time, not from the photo's EXIF — camera captures on
 * Android routinely arrive with EXIF stripped, and EXIF can be edited.
 */
export function NewCheck({ postId, checksRemaining, onSubmitted }: Props) {
  const theme = useTheme();
  const [busy, setBusy] = useState<null | 'locating' | 'uploading'>(null);
  const [result, setResult] = useState<HideAndSeekCheckResultType | null>(null);

  const capture = async () => {
    if (busy) return;

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('კამერა', 'შემოწმებისთვის კამერაზე წვდომაა საჭირო.');
      return;
    }

    const picked = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (picked.canceled || !picked.assets?.[0]) return;
    const asset = picked.assets[0];

    try {
      setBusy('locating');
      const coordinates = await getLiveLocation();
      if (!coordinates) {
        Alert.alert('მდებარეობა', 'მდებარეობა ვერ დადგინდა. ჩართე ლოკაცია და სცადე თავიდან.');
        return;
      }

      setBusy('uploading');
      const response = await hideAndSeekApi.submitCheck(
        postId,
        { uri: asset.uri, type: asset.mimeType ?? 'image/jpeg' },
        coordinates
      );

      setResult(response);
      onSubmitted?.(response);
    } catch (err) {
      Alert.alert('შეცდომა', err instanceof Error ? err.message : 'სცადე თავიდან.');
    } finally {
      setBusy(null);
    }
  };

  if (result) {
    return (
      <View className="rounded-lg p-4 items-center gap-2" style={{ backgroundColor: theme.surfaceAlt }}>
        {result.found ? (
          <>
            <Feather name="check-circle" size={28} color={Colors.brand} />
            <Text className="text-base font-bold" style={{ color: Colors.brand }}>იპოვე!</Text>
            {result.gameEnded && (
              <Text className="text-sm" style={{ color: theme.textMuted }}>თამაში ყველასთვის დასრულდა.</Text>
            )}
          </>
        ) : (
          <>
            <Text className="text-2xl font-bold" style={{ color: theme.text }}>
              {formatDistance(result.distanceMeters)}
            </Text>
            <Text className="text-sm" style={{ color: theme.textMuted }}>
              დარჩა {result.checksRemaining} მცდელობა
            </Text>
            {result.checksRemaining > 0 && (
              <Pressable
                onPress={() => setResult(null)}
                className="mt-1 rounded-md px-3 py-1.5"
                style={{ borderWidth: 1, borderColor: theme.border }}
              >
                <Text className="text-sm font-medium" style={{ color: theme.text }}>კიდევ ერთი</Text>
              </Pressable>
            )}
          </>
        )}
      </View>
    );
  }

  return (
    <View className="gap-2">
      <Pressable
        onPress={capture}
        disabled={!!busy || checksRemaining <= 0}
        className="flex-row items-center justify-center gap-2 rounded-md px-4 py-3"
        style={{ backgroundColor: Colors.brand, opacity: busy || checksRemaining <= 0 ? 0.5 : 1 }}
      >
        {busy ? (
          <ActivityIndicator color={Colors.onAccent} size="small" />
        ) : (
          <Feather name="camera" size={18} color={Colors.onAccent} />
        )}
        <Text className="text-sm font-bold" style={{ color: Colors.onAccent }}>
          {busy === 'locating'
            ? 'მდებარეობა იძებნება...'
            : busy === 'uploading'
              ? 'იგზავნება...'
              : `შემოწმება (${checksRemaining})`}
        </Text>
      </Pressable>
      <Text className="text-xs text-center" style={{ color: theme.textMuted }}>
        ფოტო თამაშის ბოლომდე მხოლოდ შენ და ავტორს გიჩანთ.
      </Text>
    </View>
  );
}
