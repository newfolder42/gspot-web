import { getPostForView } from '@/lib/posts';
import type { Metadata } from 'next';
import PostDetailClient from '@/components/post-detail-client';
import NotFound from '@/app/not-found';
import { getCurrentUser } from '@/lib/session';
import { PUBLIC_SITE_URL, APP_NAME } from '@/lib/constants';

type Props = { params: Promise<{ id: number }> };

export default async function Page({ params }: Props) {
  const [{ id }, currentUser] = await Promise.all([params, getCurrentUser()]);

  const post = await getPostForView(currentUser?.userId || 0, id);

  if (!post) return NotFound();

  return <PostDetailClient post={post} />;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!isFinite(id)) return {};

  const post = await getPostForView(0, id);
  if (!post) return {};

  const image = post.image ?? undefined;

  const defaultTitle = `გამოიცანი ${post.author}-ის ფოტო-სურათის მდებარეობა ${APP_NAME}-ზე`;
  const seoTitle = post.title && post.title.length <= 20
    ? `${post.title} | ${defaultTitle}`
    : defaultTitle;

  const seoDescription = post.title
    ? `გამოიცანი ${post.author}-ის გამოქვეყნებული ფოტო-სურათის ზუსტი მდებარეობა ${APP_NAME}-ის გეოგრაფიული გამოცანის თამაშში.`
    : `გამოიცანი ფოტო-სურათის ზუსტი მდებარეობა მდებარეობა ${APP_NAME}-ის პოპულარულ გეოგრაფიულ თამაშში.`;

  return {
    title: seoTitle,
    description: seoDescription,
    alternates: {
      canonical: `https://${PUBLIC_SITE_URL}/post/${post.id}`,
    },
    openGraph: {
      type: 'article',
      title: seoTitle,
      siteName: PUBLIC_SITE_URL,
      description: seoDescription,
      url: `https://${PUBLIC_SITE_URL}/post/${post.id}`,
      images: image ? [{
        url: image,
        alt: post.title || `${post.author}-ის სურათის | ` + post.title,
        width: 1200,
        height: 630,
      }] : undefined,
      publishedTime: post.date,
      authors: post.author ? [`${PUBLIC_SITE_URL}/account/${post.author}`] : undefined,
      section: 'გეოგრაფიული გამოცნობა',
      tags: ['გამოიცანი', 'გეოგრაფია', 'საქართველო', 'ფოტო', 'ლოკაცია'],
    }
  };
}
