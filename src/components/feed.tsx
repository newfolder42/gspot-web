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
      posts = await getAccountPosts(accountUserId!, 20);
      break;
    case "global-feed":
      posts = await getGlobalPosts(userId, 20);
      break;
  }

  return (
    <div className="max-w-2xl mx-auto mt-8 space-y-8">
      {
        showCreate &&
        <div>
          <CreatePost showCreate={true} />
        </div>
      }
      {posts.map((post) => {
        switch (post.type) {
          case 'gps-photo':
          default:
            return <GpsPost key={post.id} post={post as GpsPostType} />;
        }
      })}
    </div>
  );
}
