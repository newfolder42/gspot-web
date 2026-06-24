import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getZone, getZoneMember } from '@/actions/zones';
import { getZoneQuestsEnabled } from '@/lib/zones';
import { getCurrentUser } from '@/lib/session';
import { getZoneQuestsPendingModeration } from '@/lib/quests';
import ZoneQuestModerationList from '@/components/zone/zone-quest-moderation-list';
import { APP_NAME } from '@/types/constants';

export const metadata: Metadata = {
  title: `მოდერაცია | ${APP_NAME}`,
};

export default async function ZoneQuestModerationPage({ params }: { params: Promise<{ zoneSlug: string }> }) {
  const { zoneSlug } = await params;

  const [zone, currentUser] = await Promise.all([getZone(zoneSlug), getCurrentUser()]);
  if (!zone || !currentUser) return notFound();
  if (!(await getZoneQuestsEnabled(zone.id))) return notFound();

  const member = await getZoneMember(zone.id, currentUser.userId);
  if (!(member?.role && ['owner', 'admin', 'moderator'].includes(member.role))) {
    return notFound();
  }

  const summaries = await getZoneQuestsPendingModeration(zone.id);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">მოდერაცია</h1>
      <ZoneQuestModerationList zoneSlug={zoneSlug} summaries={summaries} />
    </div>
  );
}
