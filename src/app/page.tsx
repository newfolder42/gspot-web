import AuthTabs from "@/components/auth/auth-tabs";
import Feed from "@/components/feed";
import { APP_NAME } from "@/lib/constants";
import { getCurrentUser } from "@/lib/session";

export default async function Page() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <main className="flex flex-col items-center mt-16 min-h-screen">
        <h1 className="text-4xl font-bold mb-4 text-center">კეთილი იყოს შენი მაუსი {APP_NAME}-ზე</h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-300 mb-8 text-center max-w-xl">გააზიარე საქართველოს სურათები, აღმოაჩინე და გამოიცანი სადაა გადაღებული. შემოგვიერთდი!</p>
        <AuthTabs />
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <div className="max-w-4xl mx-auto md:py-2">
        <Feed type="global-feed"
          userId={user.userId} />
      </div>
    </main>
  );
}
