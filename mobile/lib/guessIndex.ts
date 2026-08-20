/**
 * Mirrors web `src/lib/guess-index.ts` exactly — buckets, colors and index math
 * must stay identical to the web profile, so port any change to both files.
 *
 * Number formatting is done by hand instead of `toLocaleString` (same reason as
 * `formatXp` in ProfileView): Hermes' Intl output is not worth relying on here.
 */

export const MAX_GUESS_SCORE = 100;

/** the index and its chart only carry meaning once there is a bit of history */
export const GUESS_INDEX_MIN_GUESSES = 10;

export type GuessScoreTier = {
  /** slug of the tier the bucket belongs to */
  tier: string;
  /** georgian tier name, shown in the legend */
  tierLabel: string;
};

export type GuessScoreBucket = GuessScoreTier & {
  /** inclusive lower bound */
  min: number;
  /** inclusive upper bound */
  max: number;
  /** "1-10" */
  label: string;
  color: string;
};

/**
 * 10 buckets of 10 points, colored as a rarity ramp (slate -> emerald -> sky ->
 * violet -> amber), same palette family as getLevelColor.
 */
export const GUESS_SCORE_BUCKETS: GuessScoreBucket[] = [
  { min: 1, max: 10, color: '#64748B', tier: 'weak', tierLabel: 'სუსტი' },
  { min: 11, max: 20, color: '#94A3B8', tier: 'weak', tierLabel: 'სუსტი' },
  { min: 21, max: 30, color: '#059669', tier: 'fair', tierLabel: 'არაუშავს' },
  { min: 31, max: 40, color: '#34D399', tier: 'fair', tierLabel: 'არაუშავს' },
  { min: 41, max: 50, color: '#0284C7', tier: 'good', tierLabel: 'კარგი' },
  { min: 51, max: 60, color: '#38BDF8', tier: 'good', tierLabel: 'კარგი' },
  { min: 61, max: 70, color: '#7C3AED', tier: 'great', tierLabel: 'შესანიშნავი' },
  { min: 71, max: 80, color: '#A78BFA', tier: 'great', tierLabel: 'შესანიშნავი' },
  { min: 81, max: 90, color: '#D97706', tier: 'master', tierLabel: 'ოსტატური' },
  { min: 91, max: 100, color: '#FBBF24', tier: 'master', tierLabel: 'ოსტატური' },
].map((b) => ({ ...b, label: `${b.min}-${b.max}` }));

export const GUESS_SCORE_TIERS: GuessScoreTier[] = GUESS_SCORE_BUCKETS.reduce<GuessScoreTier[]>((acc, b) => {
  if (!acc.some((t) => t.tier === b.tier)) acc.push({ tier: b.tier, tierLabel: b.tierLabel });
  return acc;
}, []);

/** Photo guesses award up to 200 — a 200 counts as a perfect 100. */
export function normalizeGuessScore(score: number): number {
  if (!Number.isFinite(score) || score <= 0) return 0;
  return Math.min(MAX_GUESS_SCORE, Math.round(score));
}

export function guessBucketIndex(score: number): number {
  const normalized = normalizeGuessScore(score);
  if (normalized <= 0) return -1;
  return Math.min(GUESS_SCORE_BUCKETS.length - 1, Math.ceil(normalized / 10) - 1);
}

export function getGuessScoreColor(score: number): string {
  const index = guessBucketIndex(score);
  return index < 0 ? GUESS_SCORE_BUCKETS[0].color : GUESS_SCORE_BUCKETS[index].color;
}

export function getGuessScoreTierLabel(score: number): string {
  const index = guessBucketIndex(score);
  return index < 0 ? GUESS_SCORE_BUCKETS[0].tierLabel : GUESS_SCORE_BUCKETS[index].tierLabel;
}

export type GuessLike = { score: number | null; distance: number | null };

export type GuessIndexBucket = GuessScoreBucket & {
  count: number;
  /** share of scored guesses, 0-1 */
  share: number;
};

export type GuessIndexStats = {
  /** every guess, including ones with no recorded score */
  total: number;
  /** guesses that carry a score and feed the index */
  scored: number;
  /** the accuracy index itself: average normalized score, 0-100 */
  index: number;
  indexColor: string;
  indexTierLabel: string;
  /** bucket the index falls into, -1 when there is nothing to score */
  indexBucket: number;
  /** highest raw score awarded — a photo guess can reach 200 */
  bestScore: number;
  bestDistance: number | null;
  worstDistance: number | null;
  averageDistance: number | null;
  medianDistance: number | null;
  buckets: GuessIndexBucket[];
  /** highest bucket count, useful for chart scaling */
  peak: number;
};

/** median of an already ascending list */
function median(sorted: number[]): number | null {
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  const value = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  return Math.round(value);
}

export function computeGuessIndex(guesses: GuessLike[]): GuessIndexStats {
  const buckets: GuessIndexBucket[] = GUESS_SCORE_BUCKETS.map((b) => ({ ...b, count: 0, share: 0 }));

  let scored = 0;
  let scoreSum = 0;
  let bestScore = 0;
  let distanceSum = 0;
  const distances: number[] = [];

  for (const guess of guesses) {
    if (typeof guess.score === 'number') {
      const normalized = normalizeGuessScore(guess.score);
      const bucket = guessBucketIndex(guess.score);
      if (bucket >= 0) {
        buckets[bucket].count += 1;
        scored += 1;
        scoreSum += normalized;
        if (guess.score > bestScore) bestScore = Math.round(guess.score);
      }
    }
    if (typeof guess.distance === 'number' && Number.isFinite(guess.distance)) {
      distances.push(guess.distance);
      distanceSum += guess.distance;
    }
  }

  for (const bucket of buckets) {
    bucket.share = scored > 0 ? bucket.count / scored : 0;
  }

  distances.sort((a, b) => a - b);
  const index = scored > 0 ? Math.round(scoreSum / scored) : 0;
  const indexBucket = scored > 0 ? guessBucketIndex(index) : -1;

  return {
    total: guesses.length,
    scored,
    index,
    indexColor: indexBucket < 0 ? '#94A3B8' : GUESS_SCORE_BUCKETS[indexBucket].color,
    indexTierLabel: indexBucket < 0 ? '—' : GUESS_SCORE_BUCKETS[indexBucket].tierLabel,
    indexBucket,
    bestScore,
    bestDistance: distances.length > 0 ? distances[0] : null,
    worstDistance: distances.length > 0 ? distances[distances.length - 1] : null,
    averageDistance: distances.length > 0 ? Math.round(distanceSum / distances.length) : null,
    medianDistance: median(distances),
    buckets,
    peak: buckets.reduce((max, b) => Math.max(max, b.count), 0),
  };
}

/** ka-GE groups thousands with a space, same as web's toLocaleString('ka-GE'). */
export function formatGuessCount(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function formatGuessDistance(distance: number): string {
  if (distance >= 1000) {
    // one decimal at most, dropped when it is zero, comma separator — matches
    // web's toLocaleString('ka-GE', { maximumFractionDigits: 1 })
    const km = Math.round((distance / 1000) * 10) / 10;
    const whole = Math.trunc(km);
    const fraction = Math.round((km - whole) * 10);
    const text = fraction > 0 ? `${formatGuessCount(whole)},${fraction}` : formatGuessCount(whole);
    return `${text} კმ`;
  }
  return `${formatGuessCount(Math.round(distance))} მ`;
}
