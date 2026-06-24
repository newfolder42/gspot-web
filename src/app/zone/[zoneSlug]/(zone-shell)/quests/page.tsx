import { notFound } from 'next/navigation';
import ZoneQuestList from '@/components/zone/zone-quest-list';
import { getZone, getZoneMember } from '@/actions/zones';
import { getZoneQuestsEnabled } from '@/lib/zones';
import { getZoneQuests, getZoneQuestsPendingModeration } from '@/lib/quests';
import { getCurrentUser } from '@/lib/session';

export default async function ZoneQuestsPage({ params }: { params: Promise<{ zoneSlug: string }> }) {
  const { zoneSlug } = await params;

  const [zone, currentUser] = await Promise.all([getZone(zoneSlug), getCurrentUser()]);

  if (!zone) return notFound();
  if (!(await getZoneQuestsEnabled(zone.id))) return notFound();

  const [quests, currentMember] = await Promise.all([
    getZoneQuests(zone.id, currentUser?.userId ?? null),
    currentUser ? getZoneMember(zone.id, currentUser.userId) : Promise.resolve(null),
  ]);

  const canCreate = currentMember?.role != null && ['owner', 'admin', 'moderator'].includes(currentMember.role);

  const pendingModerationSummaries = canCreate ? await getZoneQuestsPendingModeration(zone.id) : [];
  const pendingModerationCount = pendingModerationSummaries.reduce((sum, s) => sum + s.pendingCount, 0);

  return (
    <ZoneQuestList
      quests={quests}
      zoneSlug={zoneSlug}
      canCreate={canCreate}
      pendingModerationCount={pendingModerationCount}
      pendingModerationSummaries={pendingModerationSummaries}
    />
  );
}
