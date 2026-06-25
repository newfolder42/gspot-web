import { headers } from 'next/headers';
import { getZone, getZoneMember } from '@/actions/zones';
import { getCurrentUser } from '@/lib/session';
import {
  getQuestById,
  getQuestObjectivesWithProgress,
  getUserQuest,
  getCompletedQuestPhotos,
  getQuestCharacter,
} from '@/lib/quests';
import { getQuestLockReason } from '@/lib/questProgress';
import { getUserLevel } from '@/lib/users';
import { isMobileUserAgent } from '@/lib/device';
import QuestDetail from '@/components/zone/quest-detail';
import QuestModal from '@/components/common/quest-modal';

type Props = {
  params: Promise<{ zoneSlug: string; questId: string }>;
};

export default async function QuestDetailModal({ params }: Props) {
  const { zoneSlug, questId: questIdParam } = await params;
  const questId = Number(questIdParam);
  if (!Number.isInteger(questId)) return null;

  const [zone, currentUser] = await Promise.all([getZone(zoneSlug), getCurrentUser()]);
  if (!zone) return null;

  const quest = await getQuestById(questId);
  if (!quest || quest.zone_id !== zone.id) return null;

  const member = currentUser ? await getZoneMember(zone.id, currentUser.userId) : null;
  const userQuest = currentUser ? await getUserQuest(questId, currentUser.userId) : null;
  const objectives = await getQuestObjectivesWithProgress(questId, userQuest?.id ?? null);

  const character = quest.character_id ? await getQuestCharacter(quest.character_id) : null;

  const callerLevel = currentUser ? await getUserLevel(currentUser.userId) : 0;
  const lockReason = quest.status !== 'active'
    ? 'მისია არქივშია'
    : getQuestLockReason({
      startDate: quest.start_date,
      endDate: quest.end_date,
      requiredLevel: quest.required_level,
      callerLevel,
    });

  const canModerate = Boolean(member?.role && ['owner', 'admin', 'moderator'].includes(member.role));
  const canAccept = Boolean(!userQuest && member?.role === 'member' && member.status === 'active' && !lockReason);

  const gallery = userQuest?.status === 'completed' && currentUser
    ? await getCompletedQuestPhotos(questId, currentUser.userId)
    : [];

  const isMobile = isMobileUserAgent((await headers()).get('user-agent'));

  return (
    <QuestModal title={character?.name + '-ის მისია'}>
      <QuestDetail
        zoneSlug={zoneSlug}
        quest={quest}
        character={character}
        lockReason={lockReason}
        objectives={objectives}
        userQuest={userQuest}
        isAuthenticated={Boolean(currentUser)}
        canAccept={canAccept}
        canModerate={canModerate}
        gallery={gallery}
        isMobile={isMobile}
      />
    </QuestModal>
  );
}
