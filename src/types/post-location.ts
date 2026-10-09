/**
 * Location disputes ("გასაჩივრება"): a guesser contests a post's location, staff review it,
 * and the post is either suspended for correction or left alone.
 *
 * `state` is the post's side of it:
 *  - none       nothing contested (or contested, but not yours to see)
 *  - reported   disputes are open and waiting for staff; the post is still live
 *  - suspended  staff suspended it; the author is expected to correct the location
 *  - discarded  staff closed it for good; it stays suspended and its guesses are void
 */
export type PostLocationState = 'none' | 'reported' | 'suspended' | 'discarded';

/** Why a guesser contests the location. Picked from this list, with a note when it is 'other'. */
export const LOCATION_DISPUTE_REASONS = ['wrong_place', 'subject_not_camera', 'other'] as const;
export type LocationDisputeReason = (typeof LOCATION_DISPUTE_REASONS)[number];

export const LOCATION_DISPUTE_REASON_LABELS: Record<LocationDisputeReason, string> = {
  wrong_place: 'ლოკაცია სხვა ადგილას არის',
  subject_not_camera: 'კოორდინატები კადრის ობიექტზეა და არა გადაღების ადგილზე',
  other: 'სხვა',
};

/** Longest note a guesser or a reviewing admin may leave. */
export const LOCATION_NOTE_MAX = 500;

export type PostLocationDisputeEntry = {
  /** Who disputed. Reviewers only — the author is told why, not by whom. */
  alias: string | null;
  reason: LocationDisputeReason;
  note: string | null;
  /** The disputing guess's result. Reviewers only. */
  score: number | null;
  distance: number | null;
  createdAt: string;
};

export type PostLocationSuspensionInfo = {
  /** What the reviewing admin wrote to the author, if anything. */
  note: string | null;
  byAlias: string | null;
};

export type PostLocationReviewType = {
  state: PostLocationState;
  /** The viewer guessed under 100 and has not contested this post yet. */
  canReport: boolean;
  /** The viewer already contested their guess. */
  reported: boolean;
  /** The viewer is the zone's owner/admin (and not the author) and the post awaits a decision. */
  canReview: boolean;
  /** The viewer is the author and the post is suspended, awaiting a corrected location. */
  canCorrect: boolean;
  /** Disputes that were not dismissed; shown to the author and to reviewers only. */
  disputeCount: number;
  /** The reasons given, for the author and reviewers; reviewers also get who and the result. */
  disputes: PostLocationDisputeEntry[];
  /** Set once the post has been suspended (or discarded). */
  suspension: PostLocationSuspensionInfo | null;
  suspendedAt: string | null;
  /** The zone's upload rules — what a correct location means here. */
  rules: string[];
};

export type PostLocationReviewAction = 'suspend' | 'dismiss' | 'discard' | 'restore';
