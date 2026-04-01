import { notFound, redirect } from 'next/navigation';
import ZoneMembersList from '@/components/zone/zone-members-list';
import { getZone } from '@/actions/zones';
import { getCurrentUser } from '@/lib/session';
import { ZoneMemberInfo } from '@/types/zone';
import { getZoneMember, getZoneMembers } from '@/lib/zones';

export default async function ZoneMembersPage({ params }: { params: Promise<{ zoneSlug: string }> }) {
  const { zoneSlug } = await params;

  const zone = await getZone(zoneSlug);

  if (!zone) return notFound();

  const user = await getCurrentUser();

  if (zone.visibility == 'public' || (user && (await getZoneMember(zone.id, user.userId)))) {
    const members: ZoneMemberInfo[] = await getZoneMembers(zone.id);

    return (
      <ZoneMembersList zoneMembers={members} />
    );
  }

  return redirect('/');
}
