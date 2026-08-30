import { getPostSeoMeta } from '@/lib/posts';
import { getPostDetail } from '@/lib/post-detail';
import type { Metadata } from 'next';
import PostDetailClient from '@/components/post-detail-client';
import NotFound from '@/app/not-found';
import { getCurrentUser } from '@/lib/session';
import { getZoneTags } from '@/lib/tags';
import { getVoteSummary } from '@/lib/votes';
import { getRewardSummary } from '@/lib/rewards';
import { PUBLIC_SITE_URL, APP_NAME } from '@/types/constants';
import { loadPostCommentsAction } from '@/actions/comments';

type Props = { params: Promise<{ id: number }> };

export default async function Page({ params }: Props) {
  const [{ id }, currentUser] = await Promise.all([params, getCurrentUser()]);

  const post = await getPostDetail(currentUser?.userId ?? null, id);
  if (!post) return NotFound();

  const [comments, zoneTags, postVotes, postRewards] = await Promise.all([
    loadPostCommentsAction(post.id),
    getZoneTags(post.zoneId),
    getVoteSummary(post.id, null, currentUser?.userId ?? null),
    getRewardSummary(post.id, null, currentUser?.userId ?? null),
  ]);

  return (
    <PostDetailClient
      post={post}
      comments={comments}
      currentUser={currentUser?.alias || ''}
      currentUserId={currentUser?.userId ?? null}
      zoneTags={zoneTags}
      postVotes={postVotes}
      postRewards={postRewards}
    />
  );
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!isFinite(id)) return {};

  const post = await getPostSeoMeta(id);
  if (!post) return {};

  const isQuest = post.type === 'quest-completion';
  const ogImageUrls = post.images.length > 0 ? post.images : [`https://${PUBLIC_SITE_URL}/og-image.png`];

  const defaultTitle = isQuest
    ? `${post.author}-მა შეასრულა მისია „${post.questTitle}“ | ${APP_NAME}`
    : `გამოიცანი ${post.author}-ის ფოტო-სურათის მდებარეობა ${APP_NAME}-ზე`;
  const seoTitle = !isQuest && post.title && post.title.length <= 20
    ? `${post.title} | ${defaultTitle}`
    : defaultTitle;

  const seoDescription = isQuest
    ? `ნახე როგორ შეასრულა ${post.author}-მა მისია „${post.questTitle}“ ${APP_NAME}-ზე.`
    : post.title
      ? `გამოიცანი ${post.author}-ის პოსტის ზუსტი მდებარეობა ${APP_NAME}-ზე, ნახე ფოტო, მონიშნე შენი პასუხი რუკაზე და შეამოწმე რამდენად ახლოს მოხვდი რეალურ ლოკაციასთან.`
      : `გამოიცანი ამ პოსტის ზუსტი მდებარეობა ${APP_NAME}-ზე, ნახე ფოტო, მონიშნე შენი პასუხი რუკაზე და შეამოწმე რამდენად ახლოს მოხვდი რეალურ ლოკაციასთან.`;

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
      images: ogImageUrls.map((url) => ({
        url,
        alt: isQuest ? (post.questTitle || defaultTitle) : (post.title || defaultTitle),
        width: 1200,
        height: 630,
      })),
      publishedTime: post.date,
      authors: post.author ? [`${PUBLIC_SITE_URL}/account/${post.author}`] : undefined,
      section: isQuest ? 'მისიები' : 'გეოგრაფიული გამოცნობა',
      tags: isQuest
        ? ['მისია', 'თავგადასავალი', 'საქართველო', APP_NAME]
        : ['გამოიცანი', 'გეოგრაფია', 'საქართველო', 'ფოტო', 'ლოკაცია'],
    },
    twitter: {
      card: 'summary_large_image',
      title: seoTitle,
      description: seoDescription,
      images: ogImageUrls,
    },
  };
}
