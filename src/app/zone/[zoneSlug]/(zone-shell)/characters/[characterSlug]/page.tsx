import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getZone } from '@/actions/zones';
import { getZoneQuestCharacterBySlug } from '@/lib/quests';
import CharacterDetail from '@/components/zone/character-detail';
import { APP_NAME, PUBLIC_SITE_URL } from '@/types/constants';

type Props = {
  params: Promise<{ zoneSlug: string; characterSlug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { zoneSlug, characterSlug } = await params;
  const zone = await getZone(zoneSlug);
  if (!zone) return {};

  const character = await getZoneQuestCharacterBySlug(zone.id, characterSlug);
  if (!character) return {};

  const zoneName = zone.name?.trim() || zoneSlug;
  const seoTitle = `${character.name} | ${zoneName} | ${APP_NAME}`;
  const seoDescription = character.description?.trim()
    || `${character.name} — ${zoneName} საბზონაში, ${APP_NAME}-ზე.`;
  const canonical = `https://${PUBLIC_SITE_URL}/zone/${zoneSlug}/characters/${character.slug}`;
  const seoImage = character.avatar_url || `https://${PUBLIC_SITE_URL}/og-image.png`;

  return {
    title: seoTitle,
    description: seoDescription,
    alternates: { canonical },
    openGraph: {
      type: 'profile',
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
          alt: character.name,
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

export default async function CharacterDetailPage({ params }: Props) {
  const { zoneSlug, characterSlug } = await params;

  console.log('CharacterDetailPage params:', { zoneSlug, characterSlug });
  const zone = await getZone(zoneSlug);
  if (!zone) return notFound();

  const character = await getZoneQuestCharacterBySlug(zone.id, characterSlug);
  if (!character) return notFound();

  return <CharacterDetail character={character} />;
}
