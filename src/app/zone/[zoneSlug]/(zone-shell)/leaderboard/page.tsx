import { getLeaderboard } from '@/lib/leaderboard';
import { recentPeriodKeys } from '@/lib/period';
import LeaderboardFilters from '@/components/zone/leaderboard-filters';
import Link from 'next/link';
import type { LeaderboardEntry } from '@/types/leaderboard';
import type { Metadata } from 'next';
import { APP_NAME, PUBLIC_SITE_URL } from '@/types/constants';

export const metadata: Metadata = {
  title: `ლიდერბორდი | ${APP_NAME}`,
  description: `${APP_NAME}-ის საუკეთესო მოთამაშეები და რეიტინგები. იხილე ტოპ გეოგრაფიული გამოცნობის ექსპერტები, მათი ქულები და შედეგები. შემოუერთდი!`,
  alternates: {
    canonical: `https://${PUBLIC_SITE_URL}/leaderboard`,
  },
  openGraph: {
    title: `ლიდერბორდი - საუკეთესო მოთამაშეები | ${APP_NAME}`,
    description: `${APP_NAME}-ის საუკეთესო მოთამაშეები და რეიტინგები. იხილე ტოპ გეოგრაფიული გამოცნობის ექსპერტები, მათი ქულები და შედეგები. შემოუერთდი!`,
    type: 'website',
    url: `https://${PUBLIC_SITE_URL}/leaderboard`,
    siteName: APP_NAME,
  },
};

type Props = {
  params: Promise<{ zoneSlug: string }>;
  searchParams: Promise<{ period?: string }>;
};

export default async function LeaderboardsPage({ params, searchParams }: Props) {
  const [{ zoneSlug }, { period: rawPeriod }] = await Promise.all([params, searchParams]);

  const weekKeys = recentPeriodKeys('weekly', 10);
  const monthKeys = recentPeriodKeys('monthly', 12);
  const allValidKeys = ['total', ...weekKeys, ...monthKeys];

  const periodKey = rawPeriod && allValidKeys.includes(rawPeriod) ? rawPeriod : 'total';

  const entries: LeaderboardEntry[] = await getLeaderboard('gps-guessers', zoneSlug, periodKey, 50, 0);

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  // Olympic podium order: 2nd (left), 1st (center), 3rd (right)
  const podiumOrder = [top3[1], top3[0], top3[2]] as const;
  const podiumMeta = [
    { rank: 2, label: '#2', platformH: 'h-16', badgeCn: 'bg-slate-300 dark:bg-slate-500 text-zinc-900' },
    { rank: 1, label: '#1', platformH: 'h-24', badgeCn: 'bg-amber-400 dark:bg-amber-300 text-zinc-900' },
    { rank: 3, label: '#3', platformH: 'h-10', badgeCn: 'bg-[#b87333] dark:bg-[#b87333] text-zinc-900' },
  ] as const;

  return (
    <div className="max-w-5xl mx-auto my-auto px-2 py-2 md:py-4">
      <section className="rounded-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">ლიდერბორდი</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">ყველაზე შედეგიანი მომხმარებლები</p>
          </div>

          <LeaderboardFilters
            weekKeys={weekKeys}
            monthKeys={monthKeys}
            currentPeriod={periodKey}
          />
        </div>

        {entries.length === 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 py-8 text-center">
            ამ პერიოდისთვის მონაცემები არ არის.
          </p>
        )}

        {top3.length > 0 && (
          <div className="flex items-end justify-center gap-3 mb-8 pt-4">
            {podiumOrder.map((entry, i) => {
              const meta = podiumMeta[i];
              if (!entry) {
                return (
                  <div key={i} className="flex flex-col items-center justify-end w-28">
                    <div className={`${meta.platformH} w-full rounded-t-md bg-zinc-100 dark:bg-zinc-800`} />
                  </div>
                );
              }
              return (
                <div key={entry.userId} className="flex flex-col items-center justify-end w-28">
                  <Link
                    href={`/account/${entry.alias}`}
                    className="mb-2 text-center group"
                  >
                    <div
                      className={`mx-auto mb-1 flex h-10 w-10 items-center justify-center rounded-full text-md font-bold ${meta.badgeCn}`}
                    >
                      {meta.label}
                    </div>
                    <span className="block text-ms font-medium text-zinc-700 dark:text-zinc-100 group-hover:underline truncate max-w-full">
                      &apos;{entry.alias}
                    </span>
                    <span className="block text-ms text-zinc-500 dark:text-zinc-400">{entry.rating} ქ.</span>
                  </Link>
                  <div className={`${meta.platformH} w-full rounded-t-md ${meta.badgeCn}`} />
                </div>
              );
            })}
          </div>
        )}

        {rest.length > 0 && (
          <ol className="space-y-1" start={4}>
            {rest.map((e, i) => (
              <li key={e.userId}>
                <div className="flex items-center justify-between px-3 py-2 rounded-md">
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-right text-sm text-zinc-500 dark:text-zinc-400 font-mono">
                      {i + 4}
                    </span>
                    <Link
                      href={`/account/${e.alias}`}
                      className="text-sm text-zinc-900 dark:text-zinc-100 hover:underline"
                    >
                      &apos;{e.alias}
                    </Link>
                  </div>
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">{e.rating} ქ.</span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
