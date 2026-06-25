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
import { APP_NAME, PUBLIC_SITE_URL } from '@/types/constants';

type Props = {
  params: Promise<{ zoneSlug: string; questId: string }>;
  searchParams: Promise<{ author?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { zoneSlug, questId: questIdParam } = await params;
  const questId = Number(questIdParam);
  if (!Number.isInteger(questId)) return {};

  const quest = await getQuestById(questId);
  if (!quest) return {};

  const [zone, character] = await Promise.all([
    getZone(zoneSlug),
    quest.character_id ? getQuestCharacter(quest.character_id) : Promise.resolve(null),
  ]);

  const zoneName = zone?.name?.trim() || zoneSlug;
  const seoTitle = character
    ? `${quest.title} | ${character.name} | ${zoneName} | ${APP_NAME}`
    : `${quest.title} | ${zoneName} | ${APP_NAME}`;
  const seoDescription = quest.description?.trim()
    || character?.description?.trim()
    || (character
      ? `${character.name}-ის მისია „${quest.title}“ — ${zoneName} საბზონაში, ${APP_NAME}-ზე.`
      : `მისია „${quest.title}“ — ${zoneName} საბზონაში, ${APP_NAME}-ზე.`);
  const canonical = `https://${PUBLIC_SITE_URL}/zone/${zoneSlug}/quests/${quest.id}`;
  const seoImage = character?.avatar_url || `https://${PUBLIC_SITE_URL}/og-image.png`;

  return {
    title: seoTitle,
    description: seoDescription,
    alternates: { canonical },
    openGraph: {
      type: 'article',
      title: seoTitle,
      description: seoDescription,
      url: canonical,
      siteName: APP_NAME,
      locale: 'ka_GE',
      images: [
        {
          url: seoImage,
          width: 1200,
          height: 630,
          alt: character?.name || quest.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: seoTitle,
      description: seoDescription,
      images: [seoImage],
    },
  };
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
