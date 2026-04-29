import Feed from "@/components/feed";
import { getCurrentUser } from "@/lib/session";
import { loadPosts } from "@/actions/feed";
import { FeedType } from "@/types/post";

export default async function Page() {
  const user = await getCurrentUser();

  const feedType: FeedType = user ? 'global' : 'public';

  const posts = await loadPosts({ type: feedType, userId: user?.userId, filter: 'all' });

  return (
    <main className="min-h-screen">
      <div className="max-w-5xl mx-auto py-4 px-2">
        {/* <GameEmbed iframeClassName="h-[92dvh]"/> */}
        <Feed type={feedType}
          userId={user?.userId}
          initialPosts={posts} />
      </div> 
    </main>
  );
}
