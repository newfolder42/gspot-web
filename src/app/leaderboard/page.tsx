import { getLeaderboard } from '@/lib/leaderboard';
import Link from 'next/link';
import type { LeaderboardEntry } from '@/types/leaderboard';
import type { Metadata } from 'next';
import { APP_NAME, PUBLIC_SITE_URL } from '@/lib/constants';

export const metadata: Metadata = {
  title: `ლიდერბორდი | ${APP_NAME}`,
  description: `${APP_NAME}-ის საუკეთესო მოთამაშეები და რეიტინგები. იხილე ტოპ გეოგრაფიული გამოცნობის ექსპერტები, მათი ქულები და შედეგები. შემოუერთდი!`,
  openGraph: {
    title: `ლიდერბორდი - საუკეთესო მოთამაშეები | ${APP_NAME}`,
    description: `${APP_NAME}-ის საუკეთესო მოთამაშეები და რეიტინგები. იხილე ტოპ გეოგრაფიული გამოცნობის ექსპერტები, მათი ქულები და შედეგები. შემოუერთდი!`,
    type: 'website',
    url: `https://${PUBLIC_SITE_URL}/leaderboard`,
    siteName: APP_NAME,
  },
};

export default async function LeaderboardsPage() {
  const entries: LeaderboardEntry[] = await getLeaderboard('gps-guessers', 10, 0);

  return (
    <div className="max-w-4xl mx-auto my-auto px-2 py-2 md:py-4">
      <section className="bg-white dark:bg-zinc-900 rounded-md border border-zinc-200 dark:border-zinc-800 p-6">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-3">ლიდერბორდი</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">ყველაზე შედეგიანი მომხმარებლები გამოცნობილი ქულების მიხედვით</p>

        <ol className="space-y-2">
          {entries.map((e, i) => (
            <li key={e.userId}>
              <Link href={`/account/${e.alias}`} className="flex items-center justify-between p-2 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">
                    <span className={
                      i === 0
                        ? 'inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-400 dark:bg-amber-300 text-zinc-900 font-bold'
                        : i === 1
                          ? 'inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-300 dark:bg-slate-400 text-zinc-900 font-bold'
                          : i === 2
                            ? 'inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#b87333] dark:bg-[#b87333] text-white font-bold'
                            : 'text-zinc-900 dark:text-zinc-100'
                    }>{`#${i + 1}`}</span>
                    <span className="ml-1 text-zinc-900 dark:text-zinc-100">&apos;{e.alias}</span>
                  </span>
                </div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">{e.rating}</div>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
