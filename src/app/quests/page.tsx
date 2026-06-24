import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getUserQuestLog } from "@/lib/quests";
import QuestLog from "@/components/account/quest-log";
import type { Metadata } from "next";
import { APP_NAME } from "@/types/constants";

export const metadata: Metadata = {
  title: `მისიების ჟურნალი | ${APP_NAME}`,
  description: 'შენი მიმდინარე და დასრულებული მისიები ყველა საბზონში',
};

export default async function QuestsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/auth/signin');
  }

  const entries = await getUserQuestLog(currentUser.userId);

  return (
    <div className="max-w-3xl mx-auto px-2 py-2 md:py-4">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-6">მისიების ჟურნალი</h1>
      <QuestLog entries={entries} />
    </div>
  );
}
