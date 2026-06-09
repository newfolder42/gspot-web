import { notFound } from 'next/navigation';
import ZoneMembersList from '@/components/zone/zone-members-list';
import { getZone, getZoneMember } from '@/actions/zones';
import { getZoneMembers } from '@/lib/zones';
import { getCurrentUser } from '@/lib/session';

export default async function ZoneMembersPage({ params }: { params: Promise<{ zoneSlug: string }> }) {
  const { zoneSlug } = await params;

  const [zone, currentUser] = await Promise.all([getZone(zoneSlug), getCurrentUser()]);

  if (!zone) return notFound();

  const [members, currentMember] = await Promise.all([
    getZoneMembers(zone.id),
    currentUser ? getZoneMember(zone.id, currentUser.userId) : Promise.resolve(null),
  ]);

  const canInvite = currentMember?.role != null && ['owner', 'admin', 'moderator'].includes(currentMember.role);

  return (
    <ZoneMembersList zoneMembers={members} zoneId={zone.id} canInvite={canInvite} />
  );
}
