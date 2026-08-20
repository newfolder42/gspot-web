import { Text, View } from 'react-native';
import {
  computeGuessIndex,
  formatGuessCount,
  formatGuessDistance,
  GUESS_SCORE_BUCKETS,
  GUESS_SCORE_TIERS,
  type GuessLike,
} from '@/lib/guessIndex';

/** tallest a bar can get, in px — same numbers as web so the charts match */
const BAR_MAX_HEIGHT = 104;
const BAR_MIN_HEIGHT = 4;

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="w-1/2 pr-4">
      <Text className="text-[11px] text-zinc-500 dark:text-zinc-400">{label}</Text>
      <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{value}</Text>
    </View>
  );
}

/** Mirrors web `components/account/guess-index-panel`. */
export function GuessIndexPanel({ guesses }: { guesses: GuessLike[] }) {
  const stats = computeGuessIndex(guesses);

  return (
    <View className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
      <View className="flex-row items-start gap-4">
        <View
          className="h-16 w-16 items-center justify-center rounded-md"
          style={{
            borderWidth: 1,
            borderColor: stats.indexColor + '70',
            backgroundColor: stats.indexColor + '18',
          }}
        >
          <Text className="text-2xl font-bold leading-none" style={{ color: stats.indexColor }}>
            {stats.index}
          </Text>
          <Text className="mt-1 text-[10px]" style={{ color: stats.indexColor, opacity: 0.8 }}>
            ინდექსი
          </Text>
        </View>

        <View className="flex-1">
          <Text className="text-base font-semibold text-zinc-900 dark:text-zinc-50">სიზუსტის ინდექსი</Text>
          {stats.scored > 0 ? (
            <Text className="text-xs text-zinc-500 dark:text-zinc-400">
              საშუალო ქულა {formatGuessCount(stats.scored)} გამოცნობაზე ·{' '}
              <Text className="font-medium" style={{ color: stats.indexColor }}>
                {stats.indexTierLabel}
              </Text>
            </Text>
          ) : (
            <Text className="text-xs text-zinc-500 dark:text-zinc-400">ჯერ არ არის დაქულავებული გამოცნობა</Text>
          )}

          <View className="mt-3 flex-row flex-wrap gap-y-2">
            <Stat label="გამოცნობები" value={formatGuessCount(stats.total)} />
            <Stat
              label="საუკეთესო მანძილი"
              value={stats.bestDistance === null ? '—' : formatGuessDistance(stats.bestDistance)}
            />
            <Stat
              label="ყველაზე ცუდი მანძილი"
              value={stats.worstDistance === null ? '—' : formatGuessDistance(stats.worstDistance)}
            />
          </View>
        </View>
      </View>

      <View className="mt-5">
        <View className="mb-2 flex-row flex-wrap items-baseline justify-between gap-2">
          <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">ქულების განაწილება</Text>
          <Text className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {stats.averageDistance !== null ? `საშუალო მანძილი: ${formatGuessDistance(stats.averageDistance)}` : ''}
            {stats.medianDistance !== null ? ` · მედიანა: ${formatGuessDistance(stats.medianDistance)}` : ''}
          </Text>
        </View>

        <View className="flex-row items-end gap-1" style={{ height: BAR_MAX_HEIGHT + 18 }}>
          {stats.buckets.map((bucket, i) => {
            const height =
              stats.peak > 0 && bucket.count > 0
                ? Math.max(BAR_MIN_HEIGHT, Math.round((bucket.count / stats.peak) * BAR_MAX_HEIGHT))
                : BAR_MIN_HEIGHT;
            const isIndexBucket = i === stats.indexBucket;
            return (
              <View key={bucket.label} className="flex-1 items-center justify-end">
                <Text className="mb-1 text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                  {bucket.count > 0 ? formatGuessCount(bucket.count) : ''}
                </Text>
                <View
                  className="w-full rounded-t-sm"
                  style={{
                    height,
                    backgroundColor: bucket.color,
                    opacity: bucket.count > 0 ? 1 : 0.25,
                    ...(isIndexBucket ? { boxShadow: `0px 0px 0px 2px ${bucket.color}55` } : null),
                  }}
                />
              </View>
            );
          })}
        </View>

        <View className="mt-1 flex-row gap-1 border-t border-zinc-200 dark:border-zinc-800 pt-1">
          {GUESS_SCORE_BUCKETS.map((bucket) => (
            <Text key={bucket.label} className="flex-1 text-center text-[9px] text-zinc-400 dark:text-zinc-500">
              {bucket.max}
            </Text>
          ))}
        </View>

        <View className="mt-3 flex-row flex-wrap gap-x-3 gap-y-1">
          {GUESS_SCORE_TIERS.map((tier) => {
            const color = GUESS_SCORE_BUCKETS.find((b) => b.tier === tier.tier)!.color;
            return (
              <View key={tier.tier} className="flex-row items-center gap-1">
                <View className="h-2 w-2 rounded-sm" style={{ backgroundColor: color }} />
                <Text className="text-[11px] text-zinc-500 dark:text-zinc-400">{tier.tierLabel}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}
