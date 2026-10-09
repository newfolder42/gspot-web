import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/constants/colors';
import { ZoneRulesList } from '@/components/ZoneRulesList';
import { postsApi } from '@/lib/posts';
import {
  LOCATION_DISPUTE_REASONS,
  LOCATION_DISPUTE_REASON_LABELS,
  LOCATION_NOTE_MAX,
  type LocationDisputeReason,
} from '@/types/post-location';

/** A note under this length says nothing, and "other" is nothing without it. */
const MIN_OTHER_NOTE_LENGTH = 3;

function SheetFrame({
  title,
  onClose,
  busy,
  children,
}: {
  title: string;
  onClose: () => void;
  busy: boolean;
  children: ReactNode;
}) {
  const theme = useTheme();

  return (
    <Modal transparent animationType="fade" visible onRequestClose={() => { if (!busy) onClose(); }}>
      <KeyboardAvoidingView
        behavior="padding"
        automaticOffset
        style={{ flex: 1, backgroundColor: 'rgba(24,24,27,0.7)' }}
      >
        <Pressable
          style={{ flex: 1 }}
          className="items-center justify-center px-6 py-4"
          onPress={() => { if (!busy) onClose(); }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden"
            // Bounded by the space above the keyboard, so a short window scrolls the body.
            style={{ maxHeight: '100%' }}
          >
            <View className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{title}</Text>
              <Pressable
                onPress={onClose}
                disabled={busy}
                hitSlop={8}
                className="p-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800"
              >
                <Feather name="x" size={15} color={theme.icon} />
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View className="px-4 py-4">{children}</View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function NoteInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const theme = useTheme();

  return (
    <TextInput
      disableFullscreenUI
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={theme.textMuted}
      multiline
      maxLength={LOCATION_NOTE_MAX}
      className="mt-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl px-4 py-3 text-sm border border-zinc-200 dark:border-zinc-700"
      style={{ minHeight: 72, textAlignVertical: 'top' }}
    />
  );
}

/**
 * "გასაჩივრება": the guesser says why the post's location is wrong. The zone's rules sit at
 * the top, because they are what "wrong" is measured against.
 */
export function LocationDisputeSheet({
  postId,
  rules,
  onClose,
  onDone,
}: {
  postId: number;
  rules: string[];
  onClose: () => void;
  /** The dispute was filed — or turned out to be filed already; either way the page is stale. */
  onDone: () => void;
}) {
  const [reason, setReason] = useState<LocationDisputeReason | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsNote = reason === 'other';
  const noteOk = !needsNote || note.trim().length >= MIN_OTHER_NOTE_LENGTH;
  const canSubmit = reason !== null && noteOk && !submitting;

  const submit = async () => {
    if (!reason || !canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await postsApi.disputeLocation(postId, { reason, note: note.trim() || undefined });
      onDone();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'გასაჩივრება ვერ მოხერხდა.');
      setSubmitting(false);
      // the page may have been out of date (already disputed, post since suspended)
      onDone();
    }
  };

  return (
    <SheetFrame title="გასაჩივრება" onClose={onClose} busy={submitting}>
      <Text className="text-sm text-zinc-700 dark:text-zinc-300 mb-3">
        რატომ ფიქრობ, რომ პოსტის ლოკაცია არასწორია? ზონის ადმინისტრაცია განიხილავს და საჭიროების შემთხვევაში პოსტი შეჩერდება.
      </Text>

      <ZoneRulesList rules={rules} />

      <View className="mt-3">
        {LOCATION_DISPUTE_REASONS.map((value) => {
          const active = reason === value;
          return (
            <Pressable
              key={value}
              onPress={() => setReason(value)}
              className="flex-row items-center gap-2.5 py-2"
            >
              <View
                className={`w-4 h-4 rounded-full border-2 items-center justify-center ${
                  active ? 'border-amber-600' : 'border-zinc-300 dark:border-zinc-700'
                }`}
              >
                {active ? <View className="w-2 h-2 rounded-full bg-amber-600" /> : null}
              </View>
              <Text className="flex-1 text-sm text-zinc-700 dark:text-zinc-300">
                {LOCATION_DISPUTE_REASON_LABELS[value]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <NoteInput
        value={note}
        onChange={setNote}
        placeholder={needsNote ? 'აღწერე, რა არის არასწორი' : 'დამატებითი დეტალები (არასავალდებულო)'}
      />

      {error ? <Text className="mt-2 text-xs text-red-500">{error}</Text> : null}

      <Pressable
        onPress={submit}
        disabled={!canSubmit}
        className={`mt-4 rounded-xl py-2.5 items-center ${canSubmit ? 'bg-amber-600' : 'bg-zinc-300 dark:bg-zinc-700'}`}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-sm font-semibold text-white">გასაჩივრება</Text>
        )}
      </Pressable>
    </SheetFrame>
  );
}

/**
 * Zone staff suspend a disputed post. The note is addressed to the author — it is what tells
 * them what to fix — so it is worth writing, but optional.
 */
export function SuspendPostSheet({
  postId,
  onClose,
  onDone,
}: {
  postId: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await postsApi.reviewLocation(postId, 'suspend', note.trim() || undefined);
      onDone();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'პოსტის შეჩერება ვერ მოხერხდა.');
      setSubmitting(false);
    }
  };

  return (
    <SheetFrame title="პოსტის შეჩერება" onClose={onClose} busy={submitting}>
      <Text className="text-sm text-zinc-700 dark:text-zinc-300">
        პოსტი გაქრება ლენტებიდან და ახალი გამოცნობები შეჩერდება, სანამ ავტორი ლოკაციას არ გაასწორებს.
      </Text>

      <NoteInput
        value={note}
        onChange={setNote}
        placeholder="შეტყობინება ავტორისთვის, რა უნდა გასწორდეს (არასავალდებულო)"
      />

      {error ? <Text className="mt-2 text-xs text-red-500">{error}</Text> : null}

      <Pressable
        onPress={submit}
        disabled={submitting}
        className={`mt-4 rounded-xl py-2.5 items-center ${submitting ? 'bg-zinc-300 dark:bg-zinc-700' : 'bg-rose-600'}`}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-sm font-semibold text-white">შეჩერება</Text>
        )}
      </Pressable>
    </SheetFrame>
  );
}
