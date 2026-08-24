import Feed from "@/components/feed";
import FeedEvents from "@/components/feed-events";
import PublicFeed from "@/components/public-feed";
import LandingRedirectCapture from "@/components/common/landing-redirect-capture";
import { getCurrentUser } from "@/lib/session";
import { buildLandingPath, getLandingAttribution, type LandingAttributionSearchParams } from '@/lib/landing-attribution';
import { APP_NAME } from "@/types/constants";
import { FlagIcon, ImageIcon, MapPinIcon, TrophyIcon } from "@/components/icons";
import Link from "next/link";

type Props = {
  searchParams: Promise<LandingAttributionSearchParams>;
};

export default async function Page({ searchParams }: Props) {
  const [user, resolvedSearchParams] = await Promise.all([getCurrentUser(), searchParams]);

  const landing = user ? null : getLandingAttribution(resolvedSearchParams);
  const landingPath = landing ? buildLandingPath(resolvedSearchParams) : null;

  return (
    <main className="min-h-screen">
      <div className="max-w-5xl mx-auto py-4 px-2">
        {!user && landing && landingPath && (
          <LandingRedirectCapture source={landing.source} landingPath={landingPath} utmCampaign={landing.utmCampaign} />
        )}
        {!user && (
          <div className="overflow-hidden text-zinc-900 dark:text-zinc-100 px-8 py-10">
            <h1 className="text-3xl font-extrabold mb-3">კეთილი იყოს შენი მობრძანება {APP_NAME}-ზე</h1>
            <p className="text-zinc-600 dark:text-zinc-300 mb-8 leading-relaxed max-w-2xl">
              შემოუერთდი ქართულ ლოკაციის გამომცნობ თამაშს - ატვირთე საქართველოში გადაღებული სურათები,
              გამოიცანი სხვების ატვირთული ფოტოს მდებარეობა რუკაზე, შეასრულე{" "}
              <Link href="/zone/public/quests" className="underline underline-offset-2 font-semibold hover:text-teal-500">
                მისიები
              </Link>{" "}
              საბზონებში და დააგროვე ქულები, რომ აიწიო{" "}
              <Link href="/zone/public/leaderboard" className="underline underline-offset-2 font-semibold hover:text-teal-500">
                ლიდერბორდში
              </Link>.
            </p>
            <ul className="grid gap-4 sm:grid-cols-2 mb-8">
              <li className="flex gap-3">
                <ImageIcon className="w-5 h-5 mt-0.5 shrink-0 text-teal-500" />
                <div>
                  <p className="text-sm font-semibold">ატვირთე სურათი</p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">გამოაქვეყნე საქართველოში გადაღებული ფოტო.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <MapPinIcon className="w-5 h-5 mt-0.5 shrink-0 text-teal-500" />
                <div>
                  <p className="text-sm font-semibold">გამოიცანი მდებარეობა</p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">მონიშნე რუკაზე სავარაუდო ადგილი. რაც უფრო ახლოს ხარ, მით მეტ ქულას იღებ.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <FlagIcon className="w-5 h-5 mt-0.5 shrink-0 text-teal-500" />
                <div>
                  <p className="text-sm font-semibold">შეასრულე მისიები</p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    საბზონების{" "}
                    <Link href="/zone/public/quests" className="underline underline-offset-2 hover:text-teal-500">მისიები</Link>{" "}
                    კონკრეტული ადგილების მოსანახულებლად და ფოტოების ასატვირთად.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <TrophyIcon className="w-5 h-5 mt-0.5 shrink-0 text-teal-500" />
                <div>
                  <p className="text-sm font-semibold">გახსენი მიღწევები</p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">აქტივობისთვის დააგროვე ქულები, გახსენი მიღწევები, მიიღე ჯილდოები და აიწიე ლიდერბორდში.</p>
                </div>
              </li>
            </ul>
            <div className="flex gap-3">
              <Link href="/auth/signin" className="text-teal-500 hover:text-teal-600 font-medium uppercase">
                ავტორიზაცია
              </Link>
              <Link href="/auth/signup" className="text-teal-500 hover:text-teal-600 font-medium uppercase">
                რეგისტრაცია
              </Link>
            </div>
            <p className="mt-8 text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
              გაეცანი პოპულარულ პოსტებს
            </p>
          </div>
        )}
        {/* <GameEmbed iframeClassName="h-[92dvh]"/> */}
        {user && <FeedEvents />}
        {user ? <Feed type="global" userId={user.userId} /> : <PublicFeed />}
      </div>
    </main>
  );
}
