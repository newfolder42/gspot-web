import { getPostSeoMeta } from '@/lib/posts';
import { getPostDetail } from '@/lib/post-detail';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PostDetailClient from '@/components/post-detail-client';
import { getCurrentUser } from '@/lib/session';
import { getZoneTags } from '@/lib/tags';
import { getVoteSummary } from '@/lib/votes';
import { getRewardSummary } from '@/lib/rewards';
import { PUBLIC_SITE_URL, APP_NAME } from '@/types/constants';
import { loadPostCommentsAction } from '@/actions/comments';
import { gpsPostHeadline, gpsPostSeoDescription, gpsPostSeoTitle } from '@/lib/post-seo';

type Props = { params: Promise<{ id: number }> };

/**
 * For a post that is not publicly visible: not published, in a zone that is not public, or
 * not there at all. Without this the page would be indexed under the site-wide default title.
 */
const NOT_INDEXABLE: Metadata = { robots: { index: false, follow: false } };

export default async function Page({ params }: Props) {
  const [{ id }, currentUser] = await Promise.all([params, getCurrentUser()]);

  const post = await getPostDetail(currentUser?.userId ?? null, id);
  // `notFound()` rather than rendering the 404 component: that answered 200 with no noindex.
  if (!post) notFound();

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
  if (!isFinite(id)) return NOT_INDEXABLE;

  const post = await getPostSeoMeta(id);
  if (!post) return NOT_INDEXABLE;

  const isQuest = post.type === 'quest-completion';
  const isGps = post.type === 'gps-photo';
  const words = { title: post.title, author: post.author, zoneLabel: post.zoneName, tagName: post.tagName };

  const defaultTitle = isQuest
    ? `${post.author}-მა შეასრულა მისია „${post.questTitle}“ | ${APP_NAME}`
    : `გამოიცანი ${post.author}-ის ფოტო-სურათის მდებარეობა ${APP_NAME}-ზე`;

  // Guess posts are named after their own title, however long. The other post types keep
  // the generic wording they always had.
  const seoTitle = isGps
    ? gpsPostSeoTitle(words)
    : !isQuest && post.title && post.title.length <= 20
      ? `${post.title} | ${defaultTitle}`
      : defaultTitle;

  const seoDescription = isQuest
    ? `ნახე როგორ შეასრულა ${post.author}-მა მისია „${post.questTitle}“ ${APP_NAME}-ზე.`
    : isGps
      ? gpsPostSeoDescription(words)
      : post.title
        ? `გამოიცანი ${post.author}-ის პოსტის ზუსტი მდებარეობა ${APP_NAME}-ზე, ნახე ფოტო, მონიშნე შენი პასუხი რუკაზე და შეამოწმე რამდენად ახლოს მოხვდი რეალურ ლოკაციასთან.`
        : `გამოიცანი ამ პოსტის ზუსტი მდებარეობა ${APP_NAME}-ზე, ნახე ფოტო, მონიშნე შენი პასუხი რუკაზე და შეამოწმე რამდენად ახლოს მოხვდი რეალურ ლოკაციასთან.`;

  const imageAlt = isQuest
    ? (post.questTitle || defaultTitle)
    : isGps
      ? gpsPostHeadline(words)
      : (post.title || defaultTitle);

  // The photos are not 1200x630, so no size is claimed for them; only the site-wide
  // fallback image is that size.
  const ogImages = post.images.length > 0
    ? post.images.map((url) => ({ url, alt: imageAlt }))
    : [{ url: `https://${PUBLIC_SITE_URL}/og-image.png`, alt: imageAlt, width: 1200, height: 630 }];

  return {
    title: seoTitle,
    description: seoDescription,
    alternates: {
      canonical: `https://${PUBLIC_SITE_URL}/post/${post.id}`,
    },
    openGraph: {
      type: 'article',
      title: seoTitle,
      siteName: APP_NAME,
      locale: 'ka_GE',
      description: seoDescription,
      url: `https://${PUBLIC_SITE_URL}/post/${post.id}`,
      images: ogImages,
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
      images: ogImages.map((image) => image.url),
    },
  };
}
