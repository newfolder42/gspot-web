import FeedClient from "./feed-client";
import { FeedType, FeedView } from '@/types/post';

type FeedProps = {
  userId?: number | null;
  accountUserId?: number;
  type: FeedType;
  zoneId?: number | null,
  view?: FeedView;
};

export default function Feed({ userId, accountUserId, type, zoneId, view = 'timeline' }: FeedProps) {
  return (
    <div className="max-w-4xl mx-auto">
      <FeedClient
        userId={userId}
        accountUserId={accountUserId}
        type={type}
        zoneId={zoneId}
        view={view}
      />
    </div>
  );
}
