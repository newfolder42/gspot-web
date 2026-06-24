import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { getZone, getZoneMember } from '@/actions/zones';
import { getCurrentUser } from '@/lib/session';
import {
  getQuestById,
  getQuestObjectivesWithProgress,
  getUserQuest,
  getCompletedQuestPhotos,
  getQuestPhotosByAuthorAlias,
  getQuestCharacter,
} from '@/lib/quests';
import { getQuestLockReason } from '@/lib/questProgress';
import { getUserLevel } from '@/lib/users';
import { isMobileUserAgent } from '@/lib/device';
import QuestDetail from '@/components/zone/quest-detail';
import { APP_NAME } from '@/types/constants';

type Props = {
  params: Promise<{ zoneSlug: string; questId: string }>;
  searchParams: Promise<{ author?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { questId: questIdParam } = await params;
  const questId = Number(questIdParam);
  if (!Number.isInteger(questId)) return {};

  const quest = await getQuestById(questId);
  if (!quest) return {};

  return { title: `${quest.title} | ${APP_NAME}` };
}

export default async function QuestDetailPage({ params, searchParams }: Props) {
  const { zoneSlug, questId: questIdParam } = await params;
  const { author: authorAlias } = await searchParams;
  const questId = Number(questIdParam);
  if (!Number.isInteger(questId)) return notFound();

  const [zone, currentUser] = await Promise.all([getZone(zoneSlug), getCurrentUser()]);
  if (!zone) return notFound();

  const quest = await getQuestById(questId);
  if (!quest || quest.zone_id !== zone.id) return notFound();

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

  const baseGallery = userQuest?.status === 'completed' && currentUser
    ? await getCompletedQuestPhotos(questId, currentUser.userId)
    : [];

  const authorGallery = authorAlias ? await getQuestPhotosByAuthorAlias(questId, authorAlias) : [];

  const galleryByKey = new Map<string, typeof baseGallery[number]>();
  [...authorGallery, ...baseGallery].forEach(p => galleryByKey.set(`${p.userId}-${p.objectiveId}`, p));
  const gallery = Array.from(galleryByKey.values());

  const isMobile = isMobileUserAgent((await headers()).get('user-agent'));

  return (
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
      highlightAuthorAlias={authorAlias}
    />
  );
}
