import { redirect } from "next/navigation";
import Feed from "@/components/feed";
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
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">გამოსაცნობები</h1>
        <Feed type="to-guess" userId={user.userId} />
      </div>
    </main>
  );
}
