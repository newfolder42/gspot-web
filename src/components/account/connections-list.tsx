import { getCurrentUser } from '@/lib/session';
import ConnectionCard from './connection-card';
import SkeletonConnectionCard from './connection-card-skeleton';
import { getConnectionsForUserByAlias } from '@/lib/connections';
import type { ClientConnection } from '@/types/client-connection';

export default async function ConnectionsList({ userName }: { userName: string }) {
  const connections: ClientConnection[] | null = await getConnectionsForUserByAlias(userName);

  const user = await getCurrentUser();
  const isOwnProfile = user?.alias === userName;

  if (!connections) {
    return (
      <div aria-busy="true" className="space-y-3">
        {[1, 2, 3].map(i => <SkeletonConnectionCard key={i} />)}
      </div>
    );
  }

  if (connections.length === 0) return <div className="p-6">ჯერ არავინ.</div>;
  return (
    <div className="space-y-3">
      {connections.map((c) => (
        <ConnectionCard
          key={c.alias}
          alias={c.alias}
          createdAt={c.createdAt}
          profilePhoto={c.profilePhoto ? { url: c.profilePhoto } : null}
          canUnfollow={isOwnProfile}
        />
      ))}
    </div>
  );
}
