import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getZone } from '@/actions/zones';
import { getCurrentUser } from '@/lib/session';
import { getQuestById, getQuestCompletionSummary } from '@/lib/quests';
import ZoneFeed from '@/components/zone/zone-feed';
import { APP_NAME } from '@/types/constants';

type Props = {
  params: Promise<{ zoneSlug: string; questId: string }>;
};

export const metadata: Metadata = {
  title: `შესრულებული მისიები | ${APP_NAME}`,
  robots: { index: false },
};

export default async function QuestCompletionsPage({ params }: Props) {
  const { zoneSlug, questId: questIdParam } = await params;
  const questId = Number(questIdParam);
  if (!Number.isInteger(questId)) return notFound();

  const [zone, currentUser] = await Promise.all([getZone(zoneSlug), getCurrentUser()]);
  if (!zone) return notFound();

  const quest = await getQuestById(questId);
  if (!quest || quest.zone_id !== zone.id) return notFound();

  const { count, canView } = await getQuestCompletionSummary(quest.id, zone.id, currentUser?.userId);
  if (!canView) redirect(`/zone/${zoneSlug}/quests/${quest.id}`);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4 pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <Link
          href={`/zone/${zoneSlug}/quests/${quest.id}`}
          className="text-xs text-zinc-500 dark:text-zinc-400 hover:underline"
        >
          ← {quest.title}
        </Link>
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mt-1">
          შესრულებული მისიები <span className="text-zinc-400 dark:text-zinc-500 font-normal">{count}</span>
        </h1>
      </div>
      <ZoneFeed userId={currentUser?.userId ?? null} zoneId={zone.id} tags={[]} questId={quest.id} />
    </div>
  );
}
