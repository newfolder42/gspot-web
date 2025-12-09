import { getPostById } from '@/lib/posts';
import PostDetailClient from '@/components/post-detail-client';
import NotFound from '@/app/not-found';

type Props = { params: Promise<{ id: number }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  const post = await getPostById(id);

  if (!post) return NotFound();

  return <PostDetailClient post={post} />;
}
