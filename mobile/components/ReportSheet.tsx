import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { reportsApi, REPORT_REASON_LABELS, type ReportReason, type ReportTargetType } from '@/lib/reports';
import { useTheme } from '@/constants/colors';

type Props = {
  targetType: ReportTargetType;
  targetId: number;
  onClose: () => void;
};

const REASON_OPTIONS = Object.entries(REPORT_REASON_LABELS) as [ReportReason, string][];

/** Mirrors the web ReportModal — reason list plus optional details, one shared endpoint. */
export function ReportSheet({ targetType, targetId, onClose }: Props) {
  const theme = useTheme();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!reason || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await reportsApi.submit(targetType, targetId, reason, details.trim() || undefined);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'რეპორტის გაგზავნა ვერ მოხერხდა.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(24,24,27,0.7)' }}
        className="items-center justify-center px-6"
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden"
        >
          <View className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">რეპორტი</Text>
            <Pressable onPress={onClose} hitSlop={8} className="p-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800">
              <Feather name="x" size={15} color={theme.icon} />
            </Pressable>
          </View>

          {done ? (
            <View className="px-4 py-5">
              <Text className="text-sm text-zinc-700 dark:text-zinc-300">
                შენი რეპორტი მიღებულია და განიხილება.
              </Text>
              <Pressable onPress={onClose} className="mt-4 rounded-xl bg-zinc-900 dark:bg-zinc-100 py-2.5 items-center">
                <Text className="text-sm font-semibold text-white dark:text-zinc-900">დახურვა</Text>
              </Pressable>
            </View>
          ) : (
            <View className="px-4 py-4">
              {REASON_OPTIONS.map(([value, label]) => {
                const active = reason === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => setReason(value)}
                    className="flex-row items-center gap-2.5 py-2"
                  >
                    <View
                      className={`w-4 h-4 rounded-full border-2 items-center justify-center ${
                        active ? 'border-red-600' : 'border-zinc-300 dark:border-zinc-700'
                      }`}
                    >
                      {active ? <View className="w-2 h-2 rounded-full bg-red-600" /> : null}
                    </View>
                    <Text className="text-sm text-zinc-700 dark:text-zinc-300">{label}</Text>
                  </Pressable>
                );
              })}

              <TextInput
                value={details}
                onChangeText={setDetails}
                placeholder="დამატებითი დეტალები (არასავალდებულო)"
                placeholderTextColor={theme.textMuted}
                multiline
                maxLength={1000}
                className="mt-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl px-4 py-3 text-sm border border-zinc-200 dark:border-zinc-700"
                style={{ minHeight: 72, textAlignVertical: 'top' }}
              />

              {error ? <Text className="mt-2 text-xs text-red-500">{error}</Text> : null}

              <Pressable
                onPress={submit}
                disabled={!reason || submitting}
                className={`mt-4 rounded-xl py-2.5 items-center ${!reason || submitting ? 'bg-zinc-300 dark:bg-zinc-700' : 'bg-red-600'}`}
              >
                {submitting ? <ActivityIndicator color="#fff" /> : <Text className="text-sm font-semibold text-white">გაგზავნა</Text>}
              </Pressable>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
