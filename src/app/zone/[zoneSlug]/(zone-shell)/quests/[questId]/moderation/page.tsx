import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getZone, getZoneMember } from '@/actions/zones';
import { getCurrentUser } from '@/lib/session';
import { getQuestById, getPendingObjectiveReviews } from '@/lib/quests';
import QuestModerationQueue from '@/components/zone/quest-moderation-queue';
import { APP_NAME } from '@/types/constants';

type Props = {
  params: Promise<{ zoneSlug: string; questId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { questId: questIdParam } = await params;
  const questId = Number(questIdParam);
  if (!Number.isInteger(questId)) return {};

  const quest = await getQuestById(questId);
  if (!quest) return {};

  return { title: `მოდერაცია · ${quest.title} | ${APP_NAME}` };
}

export default async function QuestModerationPage({ params }: Props) {
  const { zoneSlug, questId: questIdParam } = await params;
  const questId = Number(questIdParam);
  if (!Number.isInteger(questId)) return notFound();

  const [zone, currentUser] = await Promise.all([getZone(zoneSlug), getCurrentUser()]);
  if (!zone || !currentUser) return notFound();

  const quest = await getQuestById(questId);
  if (!quest || quest.zone_id !== zone.id) return notFound();

  const member = await getZoneMember(zone.id, currentUser.userId);
  if (!(member?.role && ['owner', 'admin', 'moderator'].includes(member.role))) {
    return notFound();
  }

  const pendingObjectives = await getPendingObjectiveReviews(questId);

  return (
    <div className="space-y-4">
      {pendingObjectives.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">განსახილველი ამოცანები არ არის.</p>
      ) : (
        <QuestModerationQueue pendingObjectives={pendingObjectives} />
      )}
    </div>
  );
}
