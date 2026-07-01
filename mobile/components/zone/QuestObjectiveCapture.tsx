import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { questsApi } from '@/lib/quests';
import { processPostPhoto } from '@/lib/image';
import { haversineMeters } from '@/lib/guessScore';
import { extractGPSFromExif, getLiveLocation, type Coords } from '@/lib/location';
import type { ObjectiveTypeId, ObjectiveConfig, InRangeLocationConfig, CaptureMethod } from '@/types/quest';

type Stage = 'idle' | 'processing' | 'no-location' | 'out-of-range' | 'success' | 'error';

type Props = {
  userQuestId: number;
  objectiveId: number;
  type: ObjectiveTypeId;
  config: ObjectiveConfig;
  onClose: () => void;
  onSubmitted: () => void;
};

export function QuestObjectiveCapture({ userQuestId, objectiveId, type, config, onClose, onSubmitted }: Props) {
  const [stage, setStage] = useState<Stage>('idle');
  const [distance, setDistance] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const needsLocation = type === 'in_range_location';

  async function capture() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setErrorMsg('კამერაზე წვდომა საჭიროა.');
      setStage('error');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9, exif: true });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset?.uri) return;

    setStage('processing');
    setErrorMsg(null);

    try {
      let coords: Coords | null = null;
      let captureMethod: CaptureMethod | undefined;

      if (needsLocation) {
        coords = extractGPSFromExif(asset.exif);
        captureMethod = 'exif';
        if (!coords) {
          coords = await getLiveLocation();
          captureMethod = 'live_gps';
        }
        if (!coords) {
          setStage('no-location');
          return;
        }

        // Client-side range pre-check (mirrors web) so an out-of-range capture never uploads.
        // The server re-checks authoritatively in /quests/objective-capture.
        const cfg = config as InRangeLocationConfig;
        if (typeof cfg?.radiusMeters === 'number') {
          const dist = haversineMeters(coords, { latitude: cfg.latitude, longitude: cfg.longitude });
          if (dist > cfg.radiusMeters) {
            setDistance(dist);
            setStage('out-of-range');
            return;
          }
        }
      }

      // Downscale + JPEG re-encode on-device (longest edge ≤ 4096px), matching the web flow.
      const processed = await processPostPhoto(asset.uri, asset.width, asset.height, asset.fileName ?? undefined);

      const res = await questsApi.submitObjectiveCapture({
        userQuestId,
        objectiveId,
        localUri: processed.uri,
        mimeType: processed.type,
        captureMethod,
        capturedLatitude: coords?.latitude,
        capturedLongitude: coords?.longitude,
      });

      if (res.success) {
        setStage('success');
        onSubmitted();
        return;
      }
      if (res.inRange === false) {
        setDistance(res.distanceMeters ?? null);
        setStage('out-of-range');
        return;
      }
      setErrorMsg('შეცდომა მოხდა.');
      setStage('error');
    } catch {
      setErrorMsg('შეცდომა მოხდა. სცადე თავიდან.');
      setStage('error');
    }
  }

  function retake() {
    setStage('idle');
    setErrorMsg(null);
    setDistance(null);
  }

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 items-center justify-center p-6">
        <View className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800">
          <Text className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
            {needsLocation ? 'ადგილზე გადაღება' : 'ფოტოს გადაღება'}
          </Text>

          {stage === 'idle' ? (
            <>
              <Pressable
                onPress={capture}
                className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-8 items-center"
              >
                <Feather name="camera" size={28} color="#a1a1aa" />
                <Text className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 text-center">
                  {needsLocation ? 'გადაიღე ფოტო ადგილზე ამოცანის შესასრულებლად.' : 'გადაიღე ფოტო ამოცანის შესასრულებლად.'}
                </Text>
              </Pressable>
              <View className="flex-row gap-3 mt-4">
                <Pressable onPress={onClose} className="flex-1 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 items-center">
                  <Text className="text-zinc-700 dark:text-zinc-200 font-medium">გაუქმება</Text>
                </Pressable>
                <Pressable onPress={capture} className="flex-1 py-3 rounded-xl bg-teal-600 items-center flex-row justify-center gap-2">
                  <Feather name="camera" size={16} color="#fff" />
                  <Text className="text-white font-medium">გადაღება</Text>
                </Pressable>
              </View>
            </>
          ) : null}

          {stage === 'processing' ? (
            <View className="py-8 items-center gap-3">
              <ActivityIndicator color="#14B8A6" />
              <Text className="text-sm text-zinc-500 dark:text-zinc-400">მუშავდება...</Text>
            </View>
          ) : null}

          {stage === 'no-location' ? (
            <FeedbackBlock
              tone="error"
              message="ლოკაცია ვერ მოიძებნა (არც ფოტოზე, არც მოწყობილობაზე). დართე წვდომა ლოკაციაზე და სცადე თავიდან."
              onClose={onClose}
              onRetry={retake}
            />
          ) : null}

          {stage === 'out-of-range' ? (
            <FeedbackBlock
              tone="warn"
              message={`ამოცანის ლოკაციიდან ${distance !== null ? `${Math.round(distance)} მ-ით ` : ''}შორს ხარ. მიდი უფრო ახლოს და სცადე თავიდან.`}
              onClose={onClose}
              onRetry={retake}
            />
          ) : null}

          {stage === 'error' ? (
            <FeedbackBlock tone="error" message={errorMsg ?? 'შეცდომა მოხდა.'} onClose={onClose} onRetry={retake} />
          ) : null}

          {stage === 'success' ? (
            <View className="items-center gap-3 py-2">
              <Feather name="check-circle" size={40} color="#14B8A6" />
              <Text className="text-sm text-zinc-500 dark:text-zinc-400 text-center">გაგზავნილია მოდერატორის შესამოწმებლად.</Text>
              <Pressable onPress={onClose} className="mt-2 w-full py-3 rounded-xl bg-teal-600 items-center">
                <Text className="text-white font-medium">დახურვა</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function FeedbackBlock({
  tone,
  message,
  onClose,
  onRetry,
}: {
  tone: 'error' | 'warn';
  message: string;
  onClose: () => void;
  onRetry: () => void;
}) {
  const box = tone === 'error'
    ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800'
    : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800';
  const text = tone === 'error' ? 'text-red-600 dark:text-red-400' : 'text-amber-700 dark:text-amber-400';
  return (
    <>
      <View className={`p-3 rounded-md border mb-4 ${box}`}>
        <Text className={`text-xs ${text}`}>{message}</Text>
      </View>
      <View className="flex-row gap-3">
        <Pressable onPress={onClose} className="flex-1 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 items-center">
          <Text className="text-zinc-700 dark:text-zinc-200 font-medium">გაუქმება</Text>
        </Pressable>
        <Pressable onPress={onRetry} className="flex-1 py-3 rounded-xl bg-teal-600 items-center flex-row justify-center gap-2">
          <Feather name="camera" size={16} color="#fff" />
          <Text className="text-white font-medium">თავიდან</Text>
        </Pressable>
      </View>
    </>
  );
}
