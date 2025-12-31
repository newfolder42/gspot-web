import { getAccountPosts, getConnectionsPosts, getGlobalPosts } from "@/lib/posts";
import { GpsPost } from "./post-gps";
import CreatePost from "./post-create";
import { GpsPostType, PostType } from "@/types/post";

type FeedProps = {
  userId: number;
  accountUserId?: number;
  type: "account-feed" | "global-feed" | "connections-feed";
};

export default async function Feed({ userId, accountUserId, type }: FeedProps) {
  let posts: PostType[] = [];

  const isViewingOwnAccount = type === 'account-feed' && accountUserId && userId === accountUserId;
  const isLoggedIn = Boolean(userId);
  const showCreate = isLoggedIn && (type !== 'account-feed' || isViewingOwnAccount);

  switch (type) {
    case "connections-feed":
      posts = await getConnectionsPosts(userId, accountUserId!, 20);
      break;
    case "account-feed":
      posts = await getAccountPosts(userId, accountUserId!, 20);
      break;
    case "global-feed":
      posts = await getGlobalPosts(userId, 20);
      break;
  }

  return (
    <div className="max-w-4xl mx-auto">
      {
        showCreate &&
        <CreatePost />
      }
      {posts.map((post, idx) => {
        const spacing = idx === 0 ? 'mt-2' : 'mt-8';
        switch (post.type) {
          case 'gps-photo':
          default:
            return (
              <div key={post.id} className={spacing}>
                <GpsPost post={post as GpsPostType} />
              </div>
            );
        }
      })}
    </div>
  );
}
