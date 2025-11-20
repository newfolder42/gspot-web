import { getUserTokenAndValidate } from "@/lib/session";
import AuthTabs from "@/components/auth/AuthTabs";
import Feed from "@/components/feed";

export default async function Page() {
  let user: { id?: number; alias?: string } | null = null;
  try {
    const payload = await getUserTokenAndValidate();
    user = { id: payload.userId, alias: payload.alias };
  } catch (e) {
    user = null;
  }

  if (!user) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-950">
        <h1 className="text-4xl font-bold mb-4 text-center">Welcome to G-Spot</h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-300 mb-8 text-center max-w-xl">Share and discover amazing photos with the world. Sign up to create your own posts, follow others, and join the community.</p>
        <AuthTabs />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-950">
      <div className="max-w-4xl mx-auto py-2">
        {/* <h1 className="text-2xl font-bold mb-6 text-zinc-900 dark:text-zinc-50">Feed</h1> */}
        <Feed />
      </div>
    </main>
  );
}
