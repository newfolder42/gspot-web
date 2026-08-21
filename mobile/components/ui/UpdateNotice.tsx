import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { checkAppVersion, currentAppVersion } from '@/lib/appVersion';
import { storage } from '@/lib/storage';

/**
 * TEMPORARY: asks the server on start whether a newer build exists and shows a
 * skippable notice. There is no store link yet, so it is informational only —
 * dismissing it remembers the version, so each release nags at most once.
 */
export function UpdateNotice() {
  const [version, setVersion] = useState<string | null>(null);
  const [notes, setNotes] = useState<string | null>(null);
  const [required, setRequired] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const result = await checkAppVersion();
      if (cancelled || !result?.updateAvailable) return;

      // A forced update ignores the earlier dismissal.
      if (!result.updateRequired) {
        const dismissed = await storage.getDismissedUpdate();
        if (cancelled || dismissed === result.latestVersion) return;
      }

      setNotes(result.notes);
      setRequired(result.updateRequired);
      setVersion(result.latestVersion);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!version) return null;

  // Always skippable, even when the release is marked required — a bad row in
  // mobile_app_versions should never be able to lock everyone out of the app.
  const dismiss = () => {
    storage.setDismissedUpdate(version).catch(() => {});
    setVersion(null);
  };

  return (
    <Modal transparent animationType="fade" visible onRequestClose={dismiss}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(24,24,27,0.6)' }}
        className="items-center justify-center px-6"
        onPress={dismiss}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden"
        >
          <View className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex-row items-center gap-2">
            <Feather name="download" size={16} color="#14B8A6" />
            <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              აპლიკაციის განახლება
            </Text>
          </View>

          <View className="px-4 py-4 gap-2">
            <Text className="text-sm text-zinc-700 dark:text-zinc-300">
              ხელმისაწვდომია ახალი ვერსია {version}. შენ იყენებ {currentAppVersion()} ვერსიას 
              გთხოვ, განაახლო აპლიკაცია.
            </Text>
            {notes ? (
              <Text className="text-xs text-zinc-500 dark:text-zinc-400">{notes}</Text>
            ) : null}
            {required ? (
              <Text className="text-xs text-amber-600 dark:text-amber-500">
                ამ ვერსიით აპლიკაცია სწორად ვეღარ იმუშავებს.
              </Text>
            ) : null}
          </View>

          <View className="px-4 pb-4">
            <Pressable
              onPress={dismiss}
              className="rounded-xl bg-teal-500 py-2.5 items-center active:opacity-80"
            >
              <Text className="text-sm font-semibold text-white">გასაგებია</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
