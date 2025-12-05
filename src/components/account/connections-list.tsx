import { getCurrentUser } from '@/lib/session';
import ConnectionCard from './connection-card';
import SkeletonConnectionCard from './connection-card-skeleton';
import { getConnectionsForUserByAlias } from '@/lib/connections';

type Conn = {
    id: number;
    alias: string;
    name?: string | null;
    profilePhoto?: string | null;
};

export default async function ConnectionsList({ userName }: { userName: string }) {
    const connections: Conn[] | null = await getConnectionsForUserByAlias(userName);

    const user = await getCurrentUser();
    const isOwnProfile = user?.alias === userName;

    if (!connections) {
        return (
            <div aria-busy="true" className="space-y-3">
                {[1, 2, 3].map(i => <SkeletonConnectionCard key={i} />)}
            </div>
        );
    }

    if (connections.length === 0) return <div className="bg-white dark:bg-zinc-900 rounded-md p-6 border border-zinc-200 dark:border-zinc-800">ჯერ არავინ.</div>;
    return (
        <div className="space-y-3">
            {connections.map((c) => (
                <ConnectionCard
                    key={c.alias}
                    alias={c.alias}
                    name={c.name}
                    profilePhoto={c.profilePhoto ? { url: c.profilePhoto } : null}
                    canUnfollow={isOwnProfile}
                />
            ))}
        </div>
    );
}
