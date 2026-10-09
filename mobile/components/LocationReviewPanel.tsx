import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/constants/colors';
import { postsApi } from '@/lib/posts';
import { LocationDisputeSheet, SuspendPostSheet } from '@/components/LocationSheets';
import { ZoneRulesList } from '@/components/ZoneRulesList';
import {
  LOCATION_DISPUTE_REASON_LABELS,
  type PostLocationDisputeEntry,
  type PostLocationReviewAction,
  type PostLocationReviewType,
} from '@/types/post-location';

type Tone = 'amber' | 'rose' | 'zinc';

const TONES: Record<Tone, { box: string; icon: string; title: string; text: string }> = {
  amber: {
    box: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30',
    icon: '#D97706',
    title: 'text-amber-800 dark:text-amber-200',
    text: 'text-amber-700 dark:text-amber-300',
  },
  rose: {
    box: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30',
    icon: '#E11D48',
    title: 'text-rose-800 dark:text-rose-200',
    text: 'text-rose-700 dark:text-rose-300',
  },
  zinc: {
    box: 'bg-zinc-100 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700',
    icon: '#71717A',
    title: 'text-zinc-800 dark:text-zinc-100',
    text: 'text-zinc-600 dark:text-zinc-400',
  },
};

function Banner({
  tone,
  icon,
  title,
  text,
  children,
}: {
  tone: Tone;
  icon: keyof typeof Feather.glyphMap;
  title: string;
  text?: string;
  children?: ReactNode;
}) {
  const t = TONES[tone];
  return (
    <View className={`rounded-xl border px-3 py-3 ${t.box}`}>
      <View className="flex-row items-start gap-2">
        <Feather name={icon} size={16} color={t.icon} style={{ marginTop: 2 }} />
        <View className="flex-1">
          <Text className={`text-sm font-semibold ${t.title}`}>{title}</Text>
          {text ? <Text className={`text-xs mt-0.5 leading-4 ${t.text}`}>{text}</Text> : null}
        </View>
      </View>
      {children}
    </View>
  );
}

function ActionButton({
  label,
  icon,
  onPress,
  busy,
  disabled,
  variant = 'neutral',
}: {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'neutral' | 'danger';
}) {
  const theme = useTheme();
  const styles =
    variant === 'primary'
      ? { box: 'bg-teal-600', text: 'text-white', icon: '#fff' }
      : variant === 'danger'
      ? { box: 'bg-rose-600', text: 'text-white', icon: '#fff' }
      : { box: 'bg-white dark:bg-zinc-800', text: 'text-zinc-700 dark:text-zinc-200', icon: theme.icon };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      className={`h-10 rounded-lg flex-row items-center justify-center gap-2 px-3 active:opacity-80 ${styles.box}`}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      {busy ? (
        <ActivityIndicator size="small" color={styles.icon} />
      ) : (
        <Feather name={icon} size={15} color={styles.icon} />
      )}
      <Text className={`text-sm font-semibold ${styles.text}`}>{label}</Text>
    </Pressable>
  );
}

/**
 * Why the location was contested, one line per dispute. Reviewers also see who said it and
 * how far off their guess was; the author sees the reasons alone.
 */
function DisputeReasons({ disputes, tone }: { disputes: PostLocationDisputeEntry[]; tone: Tone }) {
  if (disputes.length === 0) return null;
  const t = TONES[tone];
  const shown = disputes.slice(0, 5);

  return (
    <View className="mt-2 gap-1.5">
      {shown.map((d, i) => (
        <View key={i}>
          <Text className={`text-xs font-medium ${t.title}`}>
            {d.alias ? `'${d.alias} • ` : ''}
            {LOCATION_DISPUTE_REASON_LABELS[d.reason] ?? d.reason}
            {d.score != null ? ` • ${d.score} ქულა` : ''}
            {d.distance != null ? ` • ${d.distance.toLocaleString('ka-GE')} მ` : ''}
          </Text>
          {d.note ? <Text className={`text-xs leading-4 ${t.text}`}>“{d.note}”</Text> : null}
        </View>
      ))}
      {disputes.length > shown.length ? (
        <Text className={`text-xs ${t.text}`}>და კიდევ {disputes.length - shown.length}</Text>
      ) : null}
    </View>
  );
}

type Props = {
  postId: number;
  review: PostLocationReviewType | null | undefined;
  /** There are guesses to look at on the map. */
  hasGuesses: boolean;
  onOpenGuessMap: () => void;
  onOpenCorrection: () => void;
  /** The guesser's "გასაჩივრება" sheet. Opened from the post's ⋯ menu, which lives on the screen. */
  disputeOpen: boolean;
  onDisputeClose: () => void;
};

const POST_LIST_KEYS = ['global-feed', 'to-guess-feed', 'zone-feed', 'account-posts'] as const;

/**
 * Everything the post page says and offers about a contested location, by who is looking:
 * the zone's owners/admins review, the author corrects, and a guesser's "გასაჩივრება" sheet
 * (opened from the ⋯ menu) lives here too.
 * Renders nothing for a post nobody has contested.
 */
export function LocationReviewPanel({
  postId,
  review,
  hasGuesses,
  onOpenGuessMap,
  onOpenCorrection,
  disputeOpen,
  onDisputeClose,
}: Props) {
  const queryClient = useQueryClient();
  const [showSuspend, setShowSuspend] = useState(false);

  // A decision changes what the feeds hold and what the post page offers, so refetch both.
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['post-detail', postId] });
    queryClient.invalidateQueries({ queryKey: ['post-guess-map', postId] });
    for (const key of POST_LIST_KEYS) queryClient.invalidateQueries({ queryKey: [key] });
  };

  const decide = useMutation({
    mutationFn: (action: PostLocationReviewAction) => postsApi.reviewLocation(postId, action),
    onSuccess: refresh,
    onError: (err: unknown) => {
      Alert.alert('შეცდომა', err instanceof Error ? err.message : 'მოქმედება ვერ შესრულდა.');
      // the page may have been out of date (already decided)
      refresh();
    },
  });

  if (!review) return null;

  const confirmDecision = (
    action: PostLocationReviewAction,
    title: string,
    message: string,
    confirmLabel: string,
    destructive = false
  ) => {
    Alert.alert(title, message, [
      { text: 'გაუქმება', style: 'cancel' },
      {
        text: confirmLabel,
        style: destructive ? 'destructive' : 'default',
        onPress: () => decide.mutate(action),
      },
    ]);
  };

  const deciding = (action: PostLocationReviewAction) =>
    decide.isPending && decide.variables === action;

  const blocks: ReactNode[] = [];

  // ── Guesser: contesting is in the ⋯ menu; once done, a quiet line says so ────────────
  if (!review.canReport && review.reported && review.state === 'none') {
    blocks.push(
      <View key="reported" className="flex-row items-center justify-center gap-2 py-1">
        <Feather name="flag" size={13} color="#A1A1AA" />
        <Text className="text-xs text-zinc-500 dark:text-zinc-400">ლოკაცია გასაჩივრებულია</Text>
      </View>
    );
  }

  // ── Reported: waiting for staff ──────────────────────────────────────────────────────
  if (review.state === 'reported') {
    if (review.canReview) {
      blocks.push(
        <Banner
          key="review"
          tone="amber"
          icon="alert-triangle"
          title={`ლოკაცია გასაჩივრებულია (${review.disputeCount})`}
          text="ნახე გამოცნობები რუკაზე და გადაწყვიტე: პოსტი შეჩერდეს თუ ლოკაცია სწორია."
        >
          <DisputeReasons disputes={review.disputes} tone="amber" />
          <View className="mt-3">
            <ZoneRulesList rules={review.rules} />
          </View>
          <View className="mt-3 gap-2">
            {hasGuesses ? (
              <ActionButton label="რუკაზე ნახვა" icon="map" onPress={onOpenGuessMap} />
            ) : null}
            <ActionButton
              label="პოსტის შეჩერება"
              icon="pause-circle"
              variant="danger"
              disabled={decide.isPending}
              onPress={() => setShowSuspend(true)}
            />
            <ActionButton
              label="ლოკაცია სწორია"
              icon="check-circle"
              busy={deciding('dismiss')}
              disabled={decide.isPending}
              onPress={() =>
                confirmDecision(
                  'dismiss',
                  'გასაჩივრების უარყოფა',
                  'გასაჩივრებები დაიხურება და პოსტი უცვლელად გაგრძელდება.',
                  'უარყოფა'
                )
              }
            />
          </View>
        </Banner>
      );
    } else {
      blocks.push(
        <Banner
          key="flagged"
          tone="amber"
          icon="alert-triangle"
          title={`პოსტის ლოკაცია გასაჩივრებულია (${review.disputeCount})`}
          text="ზონის ადმინისტრაცია განიხილავს. თუ ლოკაცია არასწორია, პოსტი შეჩერდება და გასწორება მოგიწევს."
        >
          <DisputeReasons disputes={review.disputes} tone="amber" />
          <View className="mt-3">
            <ZoneRulesList rules={review.rules} />
          </View>
        </Banner>
      );
    }
  }

  // ── Suspended: the author fixes it, or staff close it ───────────────────────────────
  if (review.state === 'suspended') {
    const adminNote = review.suspension?.note;
    blocks.push(
      <Banner
        key="suspended"
        tone="rose"
        icon="pause-circle"
        title="პოსტი შეჩერებულია"
        text={
          review.canCorrect
            ? 'ლოკაცია არასწორია. გაასწორე და პოსტი კვლავ გამოჩნდება, გამოცნობების ქულები კი თავიდან გადაითვლება.'
            : review.canReview
            ? 'ველოდებით ავტორის მიერ ლოკაციის გასწორებას. საჭიროების შემთხვევაში შეგიძლია პოსტი სამუდამოდ დახურო.'
            : 'ლოკაციის გასწორებამდე პოსტი დამალულია.'
        }
      >
        {adminNote ? (
          <View className="mt-2 rounded-lg bg-white/70 dark:bg-zinc-900/40 px-3 py-2">
            <Text className="text-xs font-semibold text-rose-800 dark:text-rose-200">
              {review.suspension?.byAlias ? `'${review.suspension.byAlias}-ის შეტყობინება` : 'ადმინისტრაციის შეტყობინება'}
            </Text>
            <Text className="text-xs leading-4 mt-0.5 text-rose-700 dark:text-rose-300">{adminNote}</Text>
          </View>
        ) : null}
        <DisputeReasons disputes={review.disputes} tone="rose" />
        {review.canCorrect || review.canReview ? (
          <>
            <View className="mt-3">
              <ZoneRulesList rules={review.rules} />
            </View>
            <View className="mt-3 gap-2">
              {review.canCorrect ? (
                <ActionButton
                  label="ლოკაციის გასწორება"
                  icon="map-pin"
                  variant="primary"
                  onPress={onOpenCorrection}
                />
              ) : null}
              {review.canReview && hasGuesses ? (
                <ActionButton label="რუკაზე ნახვა" icon="map" onPress={onOpenGuessMap} />
              ) : null}
              {review.canReview ? (
                <>
                  <ActionButton
                    label="აღდგენა"
                    icon="rotate-ccw"
                    busy={deciding('restore')}
                    disabled={decide.isPending}
                    onPress={() =>
                      confirmDecision(
                        'restore',
                        'პოსტის აღდგენა',
                        'შეჩერება მოიხსნება და პოსტი ლოკაციის ცვლილების გარეშე დაბრუნდება.',
                        'აღდგენა'
                      )
                    }
                  />
                  <ActionButton
                    label="სამუდამოდ დახურვა"
                    icon="x-octagon"
                    variant="danger"
                    busy={deciding('discard')}
                    disabled={decide.isPending}
                    onPress={() =>
                      confirmDecision(
                        'discard',
                        'სამუდამოდ დახურვა',
                        'პოსტი სამუდამოდ შეჩერებული დარჩება და მისი გამოცნობები გაუქმდება. მიღწევები და დარიცხული ქულები უცვლელი დარჩება.',
                        'დახურვა',
                        true
                      )
                    }
                  />
                </>
              ) : null}
            </View>
          </>
        ) : null}
      </Banner>
    );
  }

  // ── Discarded: final ────────────────────────────────────────────────────────────────
  if (review.state === 'discarded') {
    blocks.push(
      <Banner
        key="discarded"
        tone="zinc"
        icon="x-octagon"
        title="პოსტი სამუდამოდ შეჩერებულია"
        text="ლოკაცია ვერ გასწორდა, ამიტომ პოსტის გამოცნობები გაუქმებულია."
      >
        <DisputeReasons disputes={review.disputes} tone="zinc" />
      </Banner>
    );
  }

  return (
    <>
      {blocks.length > 0 ? <View className="px-4 pt-3 gap-3">{blocks}</View> : null}
      {disputeOpen ? (
        <LocationDisputeSheet
          postId={postId}
          rules={review.rules}
          onClose={onDisputeClose}
          onDone={refresh}
        />
      ) : null}
      {showSuspend ? (
        <SuspendPostSheet postId={postId} onClose={() => setShowSuspend(false)} onDone={refresh} />
      ) : null}
    </>
  );
}
