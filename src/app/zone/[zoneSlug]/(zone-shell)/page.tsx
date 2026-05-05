import Feed from '@/components/feed';
import { getCurrentUser } from '@/lib/session';
import { notFound } from 'next/navigation';
import { getZone } from '@/lib/zones';

export default async function ZonePage({ params }: { params: Promise<{ zoneSlug: string }> }) {
  const { zoneSlug } = await params;

  const currentUser = await getCurrentUser();
  const currentUserId = currentUser?.userId ?? null;

  const zone = await getZone(zoneSlug);
  if (!zone) return notFound();

  return (
    <div>
      {(<Feed type='zone'
        userId={currentUserId}
        zoneId={zone.id}
        showFilter={true} />)}
    </div>
  );
}
