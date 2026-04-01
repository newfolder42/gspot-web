import SkeletonZoneMemberCard from './zone-member-card-skeleton';
import { ZoneMemberInfo } from '@/types/zone';
import ZoneMemberCard from './zone-member-card';

export default async function ZoneMembersList({ zoneMembers }: { zoneMembers: ZoneMemberInfo[] }) {

  if (!zoneMembers) {
    return (
      <div aria-busy="true" className="space-y-3">
        {[1, 2, 3].map(i => <SkeletonZoneMemberCard key={i} />)}
      </div>
    );
  }

  if (zoneMembers.length === 0) return <div className="p-6">ჯერ არავინ.</div>;
  return (
    <div className="space-y-3">
      {zoneMembers.map((c) => (
        <ZoneMemberCard
          key={c.user!.alias}
          alias={c.user!.alias}
          createdAt={c.joined_at}
          profilePhoto={c.user!.profilePhoto ? { url: c.user!.profilePhoto } : null}
        />
      ))}
    </div>
  );
}
