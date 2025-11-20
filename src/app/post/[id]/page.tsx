import Image from 'next/image';
import Link from 'next/link';
import { getPostById } from '@/lib/posts';
import PostActions from '@/components/post-actions';
import PostGuessList from '@/components/post-guess-list';

type Props = { params: Promise<{ id: number }> };

export default async function Page({ params }: Props) {
    const { id } = await params;

    const post = await getPostById(id);
    if (!post) return <div className="p-8">Post not found</div>;

    return (
        <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-950 py-10">
            <div className="max-w-3xl mx-auto space-y-6">
                <article className="bg-white dark:bg-zinc-900 rounded-lg shadow border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                    <div className="flex items-start gap-3 px-4 py-3">
                        <div className="flex-1">
                            <div className="flex items-baseline gap-2">
                                <Link href={`/account/${post.author}`} className="font-semibold text-zinc-900 dark:text-zinc-50 hover:underline">{post.author}</Link>
                                <time className="text-xs text-zinc-400">{new Date(post.date).toLocaleString()}</time>
                            </div>
                            <div className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">{post.title}</div>
                        </div>
                        <div className="flex-shrink-0">
                            <PostActions />
                        </div>
                    </div>

                    {post.image && (
                        <div className="w-full">
                            <Image src={post.image} alt={post.title || 'post image'} width={1200} height={800} className="w-full max-h-[60vh] object-cover" />
                        </div>
                    )}
                </article>

                <PostGuessList postId={post.id} />
            </div>
        </main>
    );
}
