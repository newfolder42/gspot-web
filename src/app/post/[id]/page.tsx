import { getPostForView } from '@/lib/posts';
import PostDetailClient from '@/components/post-detail-client';
import NotFound from '@/app/not-found';
import { getCurrentUser } from '@/lib/session';

type Props = { params: Promise<{ id: number }> };

export default async function Page({ params }: Props) {
  const [{ id }, currentUser] = await Promise.all([params, getCurrentUser()]);
  
  const post = await getPostForView(currentUser?.userId || 0, id);

  if (!post) return NotFound();

  return <PostDetailClient post={post} />;
}
