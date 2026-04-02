import { getCurrentUser } from '@/lib/session';
import { getZone, getZoneMember } from '@/actions/zones';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { APP_NAME, PUBLIC_SITE_URL } from '@/lib/constants';
import ZoneShellHeader from '@/components/zone/zone-shell-header';

type Props = {
  children: React.ReactNode;
  params: Promise<{ zoneSlug: string }>;
};

export async function generateMetadata({ params }: { params: Promise<{ zoneSlug: string }> }): Promise<Metadata> {
  const { zoneSlug } = await params;
  const zone = await getZone(zoneSlug);

  if (!zone) return {};

  const zoneName = zone.name?.trim() || zone.slug;
  const baseDescription = zone.description?.trim() || `${zoneName}-ის საბზონა ${APP_NAME}-ზე.`;
  const canonical = `https://${PUBLIC_SITE_URL}/zone/${zone.slug}`;
  const seoImage = zone.banner_url || zone.profile_photo_url || `https://${PUBLIC_SITE_URL}/og-image.png`;
  const isPublicZone = zone.visibility === 'public';

  return {
    title: `${zoneName} | საბზონა | ${APP_NAME}`,
    description: baseDescription,
    keywords: [
      zoneName,
      zone.slug,
      'საბზონა',
      'zone',
      'community',
      'photo guessing',
      'location game',
      APP_NAME,
    ],
    alternates: {
      canonical,
    },
    robots: isPublicZone
      ? { index: true, follow: true }
      : { index: false, follow: false, nocache: true },
    openGraph: {
      title: `${zoneName} | საბზონა | ${APP_NAME}`,
      description: baseDescription,
      url: canonical,
      siteName: APP_NAME,
      locale: 'ka_GE',
      type: 'website',
      images: [
        {
          url: seoImage,
          width: 1200,
          height: 630,
          alt: `${zoneName} | ${APP_NAME}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${zoneName} | ${APP_NAME}`,
      description: baseDescription,
      images: [seoImage],
    },
  };
}

export default async function UserLayout({ children, params }: Props) {
  const [{ zoneSlug }, currentUser] = await Promise.all([params, getCurrentUser()]);

  const currentUserId = currentUser?.userId ?? null;

  const zone = await getZone(zoneSlug);
  if (!zone) return notFound();

  const member = currentUserId ? await getZoneMember(zone.id, currentUserId) : null;

  const tabs = [
    { id: 'overview', label: 'ძირითადი', href: `/zone/${zoneSlug}` },
    { id: 'members', label: 'წევრები', href: `/zone/${zoneSlug}/members` },
    { id: 'leaderboard', label: 'ლიდერბორდი', href: `/zone/${zoneSlug}/leaderboard` },
  ];

  // if (member?.role == 'owner' || member?.role == 'admin') {
  //   tabs.push({ id: 'settings', label: 'პარამეტრები', href: `/zone/${zoneSlug}/settings` });
  // }

  return (
    <div className="max-w-4xl mx-auto py-4 px-2">
      <div className="overflow-hidden">
        <ZoneShellHeader
          zone={zone}
          userId={currentUserId}
          initialStatus={member?.status ?? null}
          isPublic={zone.visibility === 'public'}
          tabs={tabs}
        />

        <main className="p-2">
          {children}
        </main>
      </div>
    </div>
  );
}
