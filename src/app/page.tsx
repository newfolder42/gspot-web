import Feed from "@/components/feed";
import { getCurrentUser } from "@/lib/session";
import { APP_NAME } from "@/types/constants";
import { FeedType } from "@/types/post";
import { ImageIcon, MapPinIcon, TrophyIcon } from "@/components/icons";
import Link from "next/link";

export default async function Page() {
  const user = await getCurrentUser();

  const feedType: FeedType = user ? 'global' : 'public';

  return (
    <main className="min-h-screen">
      <div className="max-w-5xl mx-auto py-4 px-2">
        {!user && (
          <div className="overflow-hidden text-zinc-900 dark:text-zinc-100 px-8 py-10">
            <h1 className="text-3xl font-extrabold mb-3">კეთილი იყოს შენი მობრძანება {APP_NAME}-ზე</h1>
            <p className="text-teal-50 mb-6 leading-relaxed max-w-2xl">
              შემოუერთდი ქართულ ლოკაციის გამომცნობ თამაშს - ატვირთე სურათი საქართველოს ტერიტორიაზე გადაღებული,
              გამოიცანი სხვისი გადაღებული სურათის მდებარეობა, დააგროვე ქულები და მოხვდი{" "}
              <Link href="/zone/public/leaderboard" className="underline underline-offset-2 font-semibold hover:text-white transition-colors">
                ლიბერბოდში
              </Link>.
            </p>
            <ul className="flex flex-wrap gap-x-8 gap-2 mb-8 text-sm font-medium">
              <li className="flex items-center gap-1.5"><ImageIcon className="w-4 h-4" /> ატვირთე სურათი</li>
              <li className="flex items-center gap-1.5"><MapPinIcon className="w-4 h-4" /> გამოიცანი მდებარეობა</li>
              <li className="flex items-center gap-1.5"><TrophyIcon className="w-4 h-4" /> დააგროვე ქულები</li>
            </ul>
            <div className="flex gap-3">
              <Link href="/auth/signin" className="text-teal-500 hover:text-teal-600 font-medium uppercase">
                ავტორიზაცია
              </Link>
              <Link href="/auth/signup" className="text-teal-500 hover:text-teal-600 font-medium uppercase">
                რეგისტრაცია
              </Link>
            </div>
            <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
              გაეცანი პოპულარულ პოსტებს
            </p>
          </div>
        )}
        {/* <GameEmbed iframeClassName="h-[92dvh]"/> */}
        <Feed type={feedType}
          userId={user?.userId} />
      </div>
    </main>
  );
}
