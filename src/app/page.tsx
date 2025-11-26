"use server";

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
      <main className="flex flex-col items-center mt-16 min-h-screen">
        <h1 className="text-4xl font-bold mb-4 text-center">კეთილი იყოს შენი მაუსი G'Spot-ზე</h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-300 mb-8 text-center max-w-xl">გააზიარე საქართველოს სურათები, აღმოაჩინე და გამოიცანი სადაა გადაღებული. შემოგვიერთდი!</p>
        <AuthTabs />
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <div className="max-w-4xl mx-auto py-2">
        <Feed />
      </div>
    </main>
  );
}
