import SkeletonZoneMemberCard from './zone-member-card-skeleton';
import { ZoneMemberInfo } from '@/types/zone';
import ZoneMemberCard from './zone-member-card';
import InviteZoneMember from './invite-zone-member';

export default async function ZoneMembersList({
  zoneMembers,
  zoneId,
  canInvite = false,
}: {
  zoneMembers: ZoneMemberInfo[];
  zoneId?: number;
  canInvite?: boolean;
}) {

  if (!zoneMembers) {
    return (
      <div aria-busy="true" className="space-y-3">
        {[1, 2, 3].map(i => <SkeletonZoneMemberCard key={i} />)}
      </div>
    );
  }

  return (
    <div>
      {canInvite && zoneId != null && (
        <div className="flex justify-end mb-3">
          <InviteZoneMember zoneId={zoneId} />
        </div>
      )}

      {zoneMembers.length === 0 ? (
        <div className="p-6">ჯერ არავინ.</div>
      ) : (
        <div className="space-y-3">
          {zoneMembers.map((c) => (
            <ZoneMemberCard
              key={c.user!.alias}
              alias={c.user!.alias}
              createdAt={c.joined_at}
              profilePhoto={c.user!.profilePhoto ? { url: c.user!.profilePhoto } : null}
              role={c.role}
              status={c.status}
            />
          ))}
        </div>
      )}
    </div>
  );
}
