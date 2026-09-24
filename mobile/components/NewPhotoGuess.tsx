import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { postsApi } from '@/lib/posts';
import { processPostPhoto } from '@/lib/image';
import { extractGPSFromExif, type Coords } from '@/lib/location';
import type { PhotoGuessResult } from '@/types/post-guess';
import { useTheme } from '@/constants/colors';
import { PhotoDialog, PhotoSourceButtons, type PhotoSource } from '@/components/ui/PhotoDialog';

type Stage = 'idle' | 'processing' | 'no-gps' | 'success' | 'error';

type Props = {
  postId: number;
  onClose: () => void;
  onSubmitted: (result: PhotoGuessResult) => void;
};

/**
 * On-site guess ("ადგილზე") — mirrors web NewPhotoGuess. The user supplies a
 * photo taken at the location; its EXIF GPS is the guess. Scoring happens
 * server-side, so no coordinates of the target photo are ever sent to the client.
 */
export function NewPhotoGuess({ postId, onClose, onSubmitted }: Props) {
  const theme = useTheme();
  const [stage, setStage] = useState<Stage>('idle');
  const [result, setResult] = useState<PhotoGuessResult | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const pick = async (source: PhotoSource) => {
    // exif:true below needs unredacted GPS metadata for extractGPSFromExif — that
    // only comes through reliably while the app holds the media permission, so
    // this path keeps the explicit request (see the same tradeoff in submit.tsx).
    const perm =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setErrorMsg('ფოტოზე წვდომა საჭიროა.');
      setStage('error');
      return;
    }

    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.9, exif: true };
    const res =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    if (res.canceled) return;

    const asset = res.assets[0];
    if (!asset?.uri) return;

    setStage('processing');
    setErrorMsg(null);
    setPreview(asset.uri);

    try {
      const gps: Coords | null = extractGPSFromExif(asset.exif);
      if (!gps) {
        setStage('no-gps');
        return;
      }

      const processed = await processPostPhoto(
        asset.uri,
        asset.width,
        asset.height,
        asset.fileName ?? undefined
      );
      const guess = await postsApi.addPhotoGuess(
        postId,
        { uri: processed.uri, size: processed.size, type: processed.type },
        gps
      );

      setResult(guess);
      setStage('success');
      onSubmitted(guess);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'შეცდომა მოხდა. სცადე თავიდან.');
      setStage('error');
    }
  };

  const retake = () => {
    setStage('idle');
    setErrorMsg(null);
    setResult(null);
    setPreview(null);
  };

  return (
    <PhotoDialog title="გამოცნობა ადგილზე" onClose={onClose}>
      {preview ? (
        <View className="w-full h-40 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 mb-4">
          <Image source={{ uri: preview }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
        </View>
      ) : null}

      {stage === 'idle' ? (
        <PhotoSourceButtons
          description="გადაიღე ან აირჩიე ფოტო, რომელიც ამ ადგილას გადაიღე. მისი GPS იქნება შენი გამოცნობა."
          onPick={pick}
        />
      ) : stage === 'processing' ? (
        <View className="py-6 items-center">
          <ActivityIndicator color="#14B8A6" />
          <Text className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">მუშავდება...</Text>
        </View>
      ) : stage === 'no-gps' ? (
        <>
          <Text className="text-sm text-rose-600 dark:text-rose-400 text-center mb-4">
            ფოტოს არ აქვს GPS მონაცემები. საჭიროა ლოკაციით გადაღებული ფოტო.
          </Text>
          <Pressable onPress={retake} className="h-11 rounded-xl bg-teal-600 items-center justify-center">
            <Text className="text-sm font-semibold text-white">თავიდან ცდა</Text>
          </Pressable>
        </>
      ) : stage === 'success' && result ? (
        <>
          <View className="flex-row items-center justify-center gap-8 py-2">
            <View className="items-center">
              <Text className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">ქულა</Text>
              <Text className="text-3xl font-bold text-teal-600 dark:text-teal-400">{result.score}</Text>
            </View>
            <View style={{ width: 1, height: 40, backgroundColor: theme.border }} />
            <View className="items-center">
              <Text className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">მანძილი</Text>
              <Text className="text-3xl font-bold text-zinc-800 dark:text-zinc-100">
                {result.distance.toLocaleString('ka-GE')} მ
              </Text>
            </View>
          </View>
          <Pressable onPress={onClose} className="mt-4 h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800 items-center justify-center">
            <Text className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">დახურვა</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text className="text-sm text-rose-600 dark:text-rose-400 text-center mb-4">
            {errorMsg ?? 'შეცდომა მოხდა. სცადე თავიდან.'}
          </Text>
          <Pressable onPress={retake} className="h-11 rounded-xl bg-teal-600 items-center justify-center">
            <Text className="text-sm font-semibold text-white">თავიდან ცდა</Text>
          </Pressable>
        </>
      )}
    </PhotoDialog>
  );
}
