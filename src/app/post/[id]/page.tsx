import { getPostForView } from '@/lib/posts';
import type { Metadata } from 'next';
import PostDetailClient from '@/components/post-detail-client';
import NotFound from '@/app/not-found';
import { getCurrentUser } from '@/lib/session';
import { PUBLIC_SITE_URL } from '@/lib/constants';

type Props = { params: Promise<{ id: number }> };

export default async function Page({ params }: Props) {
  const [{ id }, currentUser] = await Promise.all([params, getCurrentUser()]);

  const post = await getPostForView(currentUser?.userId || 0, id);

  if (!post) return NotFound();

  return <PostDetailClient post={post} />;
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const id = Number(params.id);
  const post = await getPostForView(0, id);
  if (!post) return {};

  const image = post.image ?? undefined;

  return {
    title: post.title || `გამოიცანი ${post.author}-ის სურათის მდებარეობა`,
    description: `გამოიცანი ${post.author}-ის სურათის მდებარეობა`,
    openGraph: {
      title: post.title || undefined,
      siteName: PUBLIC_SITE_URL,
      description: post.title ? post.title : undefined,
      url: `${PUBLIC_SITE_URL}/post/${post.id}`,
      images: image ? [{ url: image, alt: post.title || `${post.author}-ის სურათის` }] : undefined,
      publishedTime: post.date,
      authors: post.author ? [`${PUBLIC_SITE_URL}/account/${post.author}`] : undefined,
    }
  };
}
