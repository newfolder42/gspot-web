import {
  computeGuessIndex,
  formatGuessDistance,
  GUESS_SCORE_TIERS,
  GUESS_SCORE_BUCKETS,
  type GuessLike,
} from '@/lib/guess-index';

/** tallest a bar can get, in px — fixed so the same numbers work on mobile */
const BAR_MAX_HEIGHT = 104;
const BAR_MIN_HEIGHT = 4;

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{value}</span>
    </div>
  );
}

export default function GuessIndexPanel({ guesses }: { guesses: GuessLike[] }) {
  const stats = computeGuessIndex(guesses);

  return (
    <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
      <div className="flex items-start gap-4">
        <div
          className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-md border"
          style={{
            color: stats.indexColor,
            borderColor: stats.indexColor + '70',
            backgroundColor: stats.indexColor + '18',
          }}
        >
          <span className="text-2xl font-bold leading-none">{stats.index}</span>
          <span className="mt-1 text-[10px] uppercase tracking-wide opacity-80">ინდექსი</span>
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">სიზუსტის ინდექსი</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {stats.scored > 0
              ? <>საშუალო ქულა {stats.scored.toLocaleString('ka-GE')} გამოცნობაზე · <span style={{ color: stats.indexColor }} className="font-medium">{stats.indexTierLabel}</span></>
              : 'ჯერ არ არის დაქულავებული გამოცნობა'}
          </p>

          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
            <Stat label="გამოცნობები" value={stats.total.toLocaleString('ka-GE')} />
            <Stat
              label="საუკეთესო მანძილი"
              value={stats.bestDistance === null ? '—' : formatGuessDistance(stats.bestDistance)}
            />
            <Stat
              label="ყველაზე ცუდი მანძილი"
              value={stats.worstDistance === null ? '—' : formatGuessDistance(stats.worstDistance)}
            />
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">ქულების განაწილება</h3>
          <span className="text-right text-[11px] text-zinc-500 dark:text-zinc-400">
            {stats.averageDistance !== null && <>საშუალო მანძილი: {formatGuessDistance(stats.averageDistance)}</>}
            {stats.medianDistance !== null && <> · მედიანა: {formatGuessDistance(stats.medianDistance)}</>}
          </span>
        </div>

        <div className="flex items-end gap-1" style={{ height: BAR_MAX_HEIGHT + 18 }}>
          {stats.buckets.map((bucket, i) => {
            const height = stats.peak > 0 && bucket.count > 0
              ? Math.max(BAR_MIN_HEIGHT, Math.round((bucket.count / stats.peak) * BAR_MAX_HEIGHT))
              : BAR_MIN_HEIGHT;
            const isIndexBucket = i === stats.indexBucket;
            return (
              <div
                key={bucket.label}
                className="flex flex-1 flex-col items-center justify-end"
                title={`${bucket.label} ქულა · ${bucket.count} გამოცნობა (${Math.round(bucket.share * 100)}%)`}
              >
                <span className="mb-1 text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                  {bucket.count > 0 ? bucket.count.toLocaleString('ka-GE') : ''}
                </span>
                <div
                  className="w-full rounded-t-sm"
                  style={{
                    height,
                    backgroundColor: bucket.color,
                    opacity: bucket.count > 0 ? 1 : 0.25,
                    boxShadow: isIndexBucket ? `0 0 0 2px ${bucket.color}55` : undefined,
                  }}
                />
              </div>
            );
          })}
        </div>

        <div className="mt-1 flex gap-1 border-t border-zinc-200 pt-1 dark:border-zinc-800">
          {GUESS_SCORE_BUCKETS.map(bucket => (
            <span key={bucket.label} className="flex-1 text-center text-[9px] text-zinc-400 dark:text-zinc-500">
              {bucket.max}
            </span>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
          {GUESS_SCORE_TIERS.map(tier => {
            const color = GUESS_SCORE_BUCKETS.find(b => b.tier === tier.tier)!.color;
            return (
              <span key={tier.tier} className="inline-flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: color }} />
                {tier.tierLabel}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
