import { notFound } from 'next/navigation';
import { loadAccountAchievements } from '@/actions/achievements';
import { getAccountByAlias } from '@/lib/account';
import AchievementsClient from '@/components/account/achievements-client';

type PageProps = {
  params: Promise<{ userName: string }>;
};

export default async function AccountAchievementsPage({ params }: PageProps) {
  const { userName } = await params;

  const account = await getAccountByAlias(userName, null);
  if (!account) return notFound();

  const achievements = await loadAccountAchievements(account.user.id);

  if (achievements.length === 0) {
    return (
      <div className="p-4 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400">
        მიღწევები ჯერ არ არის ხელმისაწვდომი.
      </div>
    );
  }

  return <AchievementsClient achievements={achievements} />;
}
