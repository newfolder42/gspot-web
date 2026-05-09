import ZoneFeed from '@/components/zone/zone-feed';
import { getCurrentUser } from '@/lib/session';
import { notFound } from 'next/navigation';
import { getZone } from '@/lib/zones';
import { getZoneTags } from '@/lib/tags';

export default async function ZonePage({ params }: { params: Promise<{ zoneSlug: string }> }) {
  const { zoneSlug } = await params;

  const currentUser = await getCurrentUser();
  const currentUserId = currentUser?.userId ?? null;

  const zone = await getZone(zoneSlug);
  if (!zone) return notFound();

  const tags = await getZoneTags(zone.id);

  return (
    <div>
      <ZoneFeed userId={currentUserId} zoneId={zone.id} tags={tags} />
    </div>
  );
}
