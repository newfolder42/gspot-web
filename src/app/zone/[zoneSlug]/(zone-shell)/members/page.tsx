import { notFound } from 'next/navigation';
import ZoneMembersList from '@/components/zone/zone-members-list';
import { getZone } from '@/actions/zones';
import { getZoneMembers } from '@/lib/zones';

export default async function ZoneMembersPage({ params }: { params: Promise<{ zoneSlug: string }> }) {
  const { zoneSlug } = await params;

  const zone = await getZone(zoneSlug);

  if (!zone) return notFound();

  const members = await getZoneMembers(zone.id);

  return (
    <ZoneMembersList zoneMembers={members} />
  );
}
