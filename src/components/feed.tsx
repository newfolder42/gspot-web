import Image from "next/image";
import Link from "next/link";
import { getRecentPosts } from "@/lib/posts";
import PostActions from "./post-actions";
import CreatePost from "./post-create";

type Post = {
  id: number;
  title: string;
  author: string;
  date: string;
  image: string;
  type: string;
  // Add more fields as needed for other post types
};

function PhotoPost({ post }: { post: Post }) {
  return (
    <article key={post.id} className="relative bg-white dark:bg-zinc-900 rounded-lg shadow border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <Link href={`/account/${post.author}`} className="font-semibold text-zinc-900 dark:text-zinc-50 hover:underline">{post.author}</Link>
            <time className="text-xs text-zinc-400">{new Date(post.date).toLocaleString()}</time>
          </div>
          <div className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{post.title}</div>
        </div>
        <div className="flex-shrink-0">
          <PostActions />
        </div>
      </div>
      <Link href={`/post/${post.id}`} className="block w-full">
        <div className="w-full">
          <Image src={post.image} alt={post.title} width={1200} height={700} className="w-full h-96 object-cover" priority={false} />
        </div>
      </Link>
    </article>
  );
}

export default async function Feed() {
  const posts: Post[] = await getRecentPosts(20);

  return (
    <div className="max-w-2xl mx-auto mt-8 space-y-8">
      <div>
        <CreatePost showCreate={true} />
      </div>
      {posts.map((post) => {
        switch (post.type) {
          case 'photo':
          default:
            return <PhotoPost key={post.id} post={post} />;
        }
      })}
    </div>
  );
}
