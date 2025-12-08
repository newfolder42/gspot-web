import { getRecentPosts } from "@/lib/posts";
import { GpsPost } from "./post-gps";
import CreatePost from "./post-create";

export default async function Feed() {
  const posts = await getRecentPosts(20);

  return (
    <div className="max-w-2xl mx-auto mt-8 space-y-8">
      <div>
        <CreatePost showCreate={true} />
      </div>
      {posts.map((post) => {
        switch (post.type) {
          case 'gps-photo':
          default:
            return <GpsPost key={post.id} post={post} />;
        }
      })}
    </div>
  );
}
