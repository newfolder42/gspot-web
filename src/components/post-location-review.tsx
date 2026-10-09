"use client";

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangleIcon, FlagIcon } from '@/components/icons';
import ZoneRulesList from '@/components/zone-rules-list';
import CorrectLocationModal from '@/components/correct-location-modal';
import { disputePostLocationAction, reviewPostLocationAction } from '@/actions/post-location';
import { locationErrorMessage } from '@/lib/postLocationMessages';
import {
  LOCATION_DISPUTE_REASONS,
  LOCATION_DISPUTE_REASON_LABELS,
  LOCATION_NOTE_MAX,
  type LocationDisputeReason,
  type PostLocationDisputeEntry,
  type PostLocationReviewAction,
  type PostLocationReviewType,
} from '@/types/post-location';

/** A note under this length says nothing, and "other" is nothing without it. */
const MIN_OTHER_NOTE_LENGTH = 3;

type Tone = 'amber' | 'rose' | 'zinc';

const TONES: Record<Tone, { box: string; icon: string; title: string; text: string }> = {
  amber: {
    box: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30',
    icon: 'text-amber-600',
    title: 'text-amber-800 dark:text-amber-200',
    text: 'text-amber-700 dark:text-amber-300',
  },
  rose: {
    box: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30',
    icon: 'text-rose-600',
    title: 'text-rose-800 dark:text-rose-200',
    text: 'text-rose-700 dark:text-rose-300',
  },
  zinc: {
    box: 'bg-zinc-100 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700',
    icon: 'text-zinc-500',
    title: 'text-zinc-800 dark:text-zinc-100',
    text: 'text-zinc-600 dark:text-zinc-400',
  },
};

function Banner({ tone, title, text, children }: { tone: Tone; title: string; text?: string; children?: ReactNode }) {
  const t = TONES[tone];
  return (
    <div className={`rounded-xl border px-3 py-3 ${t.box}`}>
      <div className="flex items-start gap-2">
        <AlertTriangleIcon className={`w-4 h-4 mt-0.5 shrink-0 ${t.icon}`} />
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-semibold ${t.title}`}>{title}</div>
          {text && <div className={`mt-0.5 text-xs leading-4 ${t.text}`}>{text}</div>}
        </div>
      </div>
      {children}
    </div>
  );
}

/**
 * Why the location was contested, one line per dispute. Reviewers also see who said it and how
 * far off their guess was; the author sees the reasons alone.
 */
function DisputeReasons({ disputes, tone }: { disputes: PostLocationDisputeEntry[]; tone: Tone }) {
  if (disputes.length === 0) return null;
  const t = TONES[tone];
  const shown = disputes.slice(0, 5);

  return (
    <div className="mt-2 space-y-1.5">
      {shown.map((d, i) => (
        <div key={i}>
          <div className={`text-xs font-medium ${t.title}`}>
            {d.alias ? `'${d.alias} • ` : ''}
            {LOCATION_DISPUTE_REASON_LABELS[d.reason] ?? d.reason}
            {d.score != null ? ` • ${d.score} ქულა` : ''}
            {d.distance != null ? ` • ${d.distance.toLocaleString('ka-GE')} მ` : ''}
          </div>
          {d.note && <div className={`text-xs leading-4 ${t.text}`}>“{d.note}”</div>}
        </div>
      ))}
      {disputes.length > shown.length && (
        <div className={`text-xs ${t.text}`}>და კიდევ {disputes.length - shown.length}</div>
      )}
    </div>
  );
}

function Dialog({ title, onClose, busy, children }: { title: string; onClose: () => void; busy: boolean; children: ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-layer-modal bg-black/50 flex items-center justify-center p-4"
      onClick={() => { if (!busy) onClose(); }}
    >
      <div
        className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-5 max-w-md w-full max-h-full overflow-y-auto space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{title}</h2>
        {children}
      </div>
    </div>
  );
}

const noteInputClass =
  'w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 text-sm';

/** "გასაჩივრება": the guesser says why the location is wrong, against the zone's rules. */
function DisputeDialog({ postId, rules, onClose, onDone }: { postId: number; rules: string[]; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState<LocationDisputeReason | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsNote = reason === 'other';
  const canSubmit = reason !== null && (!needsNote || note.trim().length >= MIN_OTHER_NOTE_LENGTH) && !submitting;

  const submit = async () => {
    if (!reason || !canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await disputePostLocationAction(postId, { reason, note: note.trim() || undefined });
      if (res.ok) {
        onDone();
        onClose();
        return;
      }
      setError(locationErrorMessage(res.error));
      // the page may have been out of date (already disputed, post since suspended)
      onDone();
    } catch {
      setError(locationErrorMessage('SERVER_ERROR'));
    }
    setSubmitting(false);
  };

  return (
    <Dialog title="გასაჩივრება" onClose={onClose} busy={submitting}>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        რატომ ფიქრობ, რომ პოსტის ლოკაცია არასწორია? ზონის ადმინისტრაცია განიხილავს და საჭიროების შემთხვევაში პოსტი შეჩერდება.
      </p>
      <ZoneRulesList rules={rules} />
      <div className="space-y-1">
        {LOCATION_DISPUTE_REASONS.map((value) => (
          <label
            key={value}
            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
          >
            <input
              type="radio"
              name="location-dispute-reason"
              value={value}
              checked={reason === value}
              onChange={() => setReason(value)}
            />
            <span className="text-sm text-zinc-700 dark:text-zinc-300">{LOCATION_DISPUTE_REASON_LABELS[value]}</span>
          </label>
        ))}
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={needsNote ? 'აღწერე, რა არის არასწორი' : 'დამატებითი დეტალები (არასავალდებულო)'}
        rows={3}
        maxLength={LOCATION_NOTE_MAX}
        className={noteInputClass}
      />
      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="flex-1 px-4 py-2 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 disabled:opacity-50"
        >
          გაუქმება
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="flex-1 px-4 py-2 rounded-md bg-amber-600 text-white disabled:opacity-50"
        >
          {submitting ? 'იგზავნება...' : 'გასაჩივრება'}
        </button>
      </div>
    </Dialog>
  );
}

/** Zone staff suspend a disputed post; the note is what tells the author what to fix. */
function SuspendDialog({ postId, onClose, onDone }: { postId: number; onClose: () => void; onDone: () => void }) {
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await reviewPostLocationAction(postId, 'suspend', note.trim() || undefined);
      if (res.ok) {
        onDone();
        onClose();
        return;
      }
      setError(locationErrorMessage(res.error));
      onDone();
    } catch {
      setError(locationErrorMessage('SERVER_ERROR'));
    }
    setSubmitting(false);
  };

  return (
    <Dialog title="პოსტის შეჩერება" onClose={onClose} busy={submitting}>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        პოსტი გაქრება ლენტებიდან და ახალი გამოცნობები შეჩერდება, სანამ ავტორი ლოკაციას არ გაასწორებს.
      </p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="შეტყობინება ავტორისთვის, რა უნდა გასწორდეს (არასავალდებულო)"
        rows={3}
        maxLength={LOCATION_NOTE_MAX}
        className={noteInputClass}
      />
      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="flex-1 px-4 py-2 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 disabled:opacity-50"
        >
          გაუქმება
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="flex-1 px-4 py-2 rounded-md bg-rose-600 text-white disabled:opacity-50"
        >
          {submitting ? 'ხდება...' : 'შეჩერება'}
        </button>
      </div>
    </Dialog>
  );
}

type Confirm = {
  action: Exclude<PostLocationReviewAction, 'suspend'>;
  title: string;
  message: string;
  label: string;
  destructive?: boolean;
};

const CONFIRMS: Record<Confirm['action'], Confirm> = {
  dismiss: {
    action: 'dismiss',
    title: 'გასაჩივრების უარყოფა',
    message: 'გასაჩივრებები დაიხურება და პოსტი უცვლელად გაგრძელდება.',
    label: 'უარყოფა',
  },
  restore: {
    action: 'restore',
    title: 'პოსტის აღდგენა',
    message: 'შეჩერება მოიხსნება და პოსტი ლოკაციის ცვლილების გარეშე დაბრუნდება.',
    label: 'აღდგენა',
  },
  discard: {
    action: 'discard',
    title: 'სამუდამოდ დახურვა',
    message:
      'პოსტი სამუდამოდ შეჩერებული დარჩება და მისი გამოცნობები გაუქმდება. მიღწევები და დარიცხული ქულები უცვლელი დარჩება.',
    label: 'დახურვა',
    destructive: true,
  },
};

function ActionButton({ label, onClick, disabled, busy, variant = 'neutral' }: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
  variant?: 'primary' | 'neutral' | 'danger';
}) {
  const cls =
    variant === 'primary'
      ? 'bg-teal-600 text-white hover:bg-teal-700'
      : variant === 'danger'
      ? 'bg-rose-600 text-white hover:bg-rose-700'
      : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${cls}`}
    >
      {busy ? 'ხდება...' : label}
    </button>
  );
}

type Props = {
  postId: number;
  review: PostLocationReviewType;
  /** The guesser's "გასაჩივრება" dialog. Opened from the post's ⋯ menu, which lives elsewhere. */
  disputeOpen: boolean;
  onDisputeClose: () => void;
};

/**
 * Everything the post page says and offers about a contested location, by who is looking:
 * the zone's owners/admins review, the author corrects, and a guesser's "გასაჩივრება" dialog
 * (opened from the ⋯ menu) lives here too.
 * Renders nothing for a post nobody has contested. Viewing the guess map is the comments
 * header's button, which reviewers get too.
 */
export default function PostLocationReview({ postId, review, disputeOpen, onDisputeClose }: Props) {
  const router = useRouter();
  const [showSuspend, setShowSuspend] = useState(false);
  const [showCorrection, setShowCorrection] = useState(false);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  // A decision changes the post's status and what the page offers; re-render it from the server.
  const refresh = () => router.refresh();

  const runConfirmed = async () => {
    if (!confirm || confirming) return;
    setConfirming(true);
    setConfirmError(null);
    try {
      const res = await reviewPostLocationAction(postId, confirm.action);
      if (res.ok) {
        setConfirm(null);
        refresh();
      } else {
        setConfirmError(locationErrorMessage(res.error));
        // the page may have been out of date (already decided)
        refresh();
      }
    } catch {
      setConfirmError(locationErrorMessage('SERVER_ERROR'));
    }
    setConfirming(false);
  };

  const openConfirm = (action: Confirm['action']) => {
    setConfirmError(null);
    setConfirm(CONFIRMS[action]);
  };

  const blocks: ReactNode[] = [];

  // ── Guesser: contesting is in the ⋯ menu; once done, a quiet line says so ────────────
  if (!review.canReport && review.reported && review.state === 'none') {
    blocks.push(
      <div key="reported" className="flex items-center justify-center gap-2 py-1 text-xs text-zinc-500 dark:text-zinc-400">
        <FlagIcon className="w-3.5 h-3.5" />
        ლოკაცია გასაჩივრებულია
      </div>
    );
  }

  // ── Reported: waiting for staff ──────────────────────────────────────────────────────
  if (review.state === 'reported') {
    if (review.canReview) {
      blocks.push(
        <Banner
          key="review"
          tone="amber"
          title={`ლოკაცია გასაჩივრებულია (${review.disputeCount})`}
          text="ნახე გამოცნობები რუკაზე („რუკაზე ნახვა“) და გადაწყვიტე: პოსტი შეჩერდეს თუ ლოკაცია სწორია."
        >
          <DisputeReasons disputes={review.disputes} tone="amber" />
          <div className="mt-3">
            <ZoneRulesList rules={review.rules} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <ActionButton label="პოსტის შეჩერება" variant="danger" onClick={() => setShowSuspend(true)} />
            <ActionButton label="ლოკაცია სწორია" onClick={() => openConfirm('dismiss')} />
          </div>
        </Banner>
      );
    } else {
      blocks.push(
        <Banner
          key="flagged"
          tone="amber"
          title={`პოსტის ლოკაცია გასაჩივრებულია (${review.disputeCount})`}
          text="ზონის ადმინისტრაცია განიხილავს. თუ ლოკაცია არასწორია, პოსტი შეჩერდება და გასწორება მოგიწევს."
        >
          <DisputeReasons disputes={review.disputes} tone="amber" />
          <div className="mt-3">
            <ZoneRulesList rules={review.rules} />
          </div>
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
        title="პოსტი შეჩერებულია"
        text={
          review.canCorrect
            ? 'ლოკაცია არასწორია. გაასწორე და პოსტი კვლავ გამოჩნდება, გამოცნობების ქულები კი თავიდან გადაითვლება.'
            : review.canReview
            ? 'ველოდებით ავტორის მიერ ლოკაციის გასწორებას. საჭიროების შემთხვევაში შეგიძლია პოსტი სამუდამოდ დახურო.'
            : 'ლოკაციის გასწორებამდე პოსტი დამალულია.'
        }
      >
        {adminNote && (
          <div className="mt-2 rounded-lg bg-white/70 dark:bg-zinc-900/40 px-3 py-2">
            <div className="text-xs font-semibold text-rose-800 dark:text-rose-200">
              {review.suspension?.byAlias ? `'${review.suspension.byAlias}-ის შეტყობინება` : 'ადმინისტრაციის შეტყობინება'}
            </div>
            <div className="mt-0.5 text-xs leading-4 text-rose-700 dark:text-rose-300">{adminNote}</div>
          </div>
        )}
        <DisputeReasons disputes={review.disputes} tone="rose" />
        {(review.canCorrect || review.canReview) && (
          <>
            <div className="mt-3">
              <ZoneRulesList rules={review.rules} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {review.canCorrect && (
                <ActionButton label="ლოკაციის გასწორება" variant="primary" onClick={() => setShowCorrection(true)} />
              )}
              {review.canReview && (
                <>
                  <ActionButton label="აღდგენა" onClick={() => openConfirm('restore')} />
                  <ActionButton label="სამუდამოდ დახურვა" variant="danger" onClick={() => openConfirm('discard')} />
                </>
              )}
            </div>
          </>
        )}
      </Banner>
    );
  }

  // ── Discarded: final ────────────────────────────────────────────────────────────────
  if (review.state === 'discarded') {
    blocks.push(
      <Banner
        key="discarded"
        tone="zinc"
        title="პოსტი სამუდამოდ შეჩერებულია"
        text="ლოკაცია ვერ გასწორდა, ამიტომ პოსტის გამოცნობები გაუქმებულია."
      >
        <DisputeReasons disputes={review.disputes} tone="zinc" />
      </Banner>
    );
  }

  return (
    <>
      {blocks.length > 0 && <div className="px-2 pb-2 space-y-3">{blocks}</div>}

      {disputeOpen && (
        <DisputeDialog postId={postId} rules={review.rules} onClose={onDisputeClose} onDone={refresh} />
      )}
      {showSuspend && <SuspendDialog postId={postId} onClose={() => setShowSuspend(false)} onDone={refresh} />}
      {showCorrection && (
        <CorrectLocationModal
          postId={postId}
          rules={review.rules}
          onClose={() => setShowCorrection(false)}
          onCorrected={refresh}
        />
      )}
      {confirm && (
        <Dialog title={confirm.title} onClose={() => setConfirm(null)} busy={confirming}>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{confirm.message}</p>
          {confirmError && <p className="text-sm text-rose-600 dark:text-rose-400">{confirmError}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirm(null)}
              disabled={confirming}
              className="flex-1 px-4 py-2 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 disabled:opacity-50"
            >
              გაუქმება
            </button>
            <button
              type="button"
              onClick={runConfirmed}
              disabled={confirming}
              className={`flex-1 px-4 py-2 rounded-md text-white disabled:opacity-50 ${confirm.destructive ? 'bg-rose-600' : 'bg-teal-600'}`}
            >
              {confirming ? 'ხდება...' : confirm.label}
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
