import { redirect } from "next/navigation";
import Link from "next/link";
import Feed from "@/components/feed";
import { DiceIcon } from "@/components/icons";
import { getCurrentUser } from "@/lib/session";
import type { Metadata } from "next";
import { APP_NAME } from "@/types/constants";

export const metadata: Metadata = {
  title: `გამოსაცნობები | ${APP_NAME}`,
  description: 'ლოკაციები, რომელთა გამოცნობაც ჯერ არ გითქვამს',
};

export default async function ToGuessPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/auth/signin');
  }

  return (
    <main className="min-h-screen">
      <div className="max-w-5xl mx-auto py-4 px-2">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">გამოსაცნობები</h1>
          <Link
            href="/to-guess/shuffle"
            className="flex items-center gap-1.5 rounded-md bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-500"
          >
            <DiceIcon className="w-4 h-4" />
            არეულად
          </Link>
        </div>
        <Feed type="to-guess" userId={user.userId} />
      </div>
    </main>
  );
}
