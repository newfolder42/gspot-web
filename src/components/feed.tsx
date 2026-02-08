import { loadPosts } from "@/actions/feed";
import CreatePost from "./post-create";
import FeedClient from "./feed-client";

type FeedProps = {
  userId: number;
  accountUserId?: number;
  type: "account-feed" | "global-feed" | "connections-feed";
};

export default async function Feed({ userId, accountUserId, type }: FeedProps) {
  const isViewingOwnAccount = type === 'account-feed' && accountUserId && userId === accountUserId;
  const isLoggedIn = Boolean(userId);
  const showCreate = isLoggedIn && (type !== 'account-feed' || isViewingOwnAccount);

  const posts = await loadPosts({ type, userId, accountUserId });

  return (
    <div className="max-w-4xl mx-auto">
      {showCreate && <CreatePost />}
      <FeedClient 
        initialPosts={posts} 
        userId={userId}
        accountUserId={accountUserId}
        type={type}
      />
    </div>
  );
}
