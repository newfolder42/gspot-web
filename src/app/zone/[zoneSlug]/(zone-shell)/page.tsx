import Feed from '@/components/feed';
import { getCurrentUser } from '@/lib/session';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { APP_NAME, PUBLIC_SITE_URL } from '@/lib/constants';
import { loadPosts } from '@/actions/feed';
import { getZone, getZoneMember } from '@/lib/zones';

export async function generateMetadata({ params }: { params: Promise<{ zoneSlug: string }> }): Promise<Metadata> {
  const { zoneSlug } = await params;

  const zone = await getZone(zoneSlug);
  if (!zone) return {};

  return {
    title: `'${zone.slug} | ${APP_NAME}`,
    description: `${zone.description}`,
    alternates: {
      canonical: `https://${PUBLIC_SITE_URL}/zone/${zone.slug}`,
    }
  };
}

export default async function ZonePage({ params }: { params: Promise<{ zoneSlug: string }> }) {
  const { zoneSlug } = await params;

  const currentUser = await getCurrentUser();
  const currentUserId = currentUser?.userId ?? null;

  const zone = await getZone(zoneSlug);
  if (!zone) return notFound();

  const member = currentUserId ? await getZoneMember(zone.id, currentUserId) : null;

  const posts = (currentUserId && member) || zone.visibility == 'public' ? await loadPosts({
    type: 'zone-feed',
    zoneId: zone.id,
    userId: currentUserId,
    filter: 'all'
  }) : [];

  return (
    <div>
      {(<Feed type='zone-feed'
        userId={currentUserId}
        initialPosts={posts}
        zoneId={zone.id}
        showFilter={true} />)}
    </div>
  );
}
