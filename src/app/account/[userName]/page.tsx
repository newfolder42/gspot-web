import Feed from '@/components/feed';
import { getAccountByAlias } from '@/lib/account';
import { getCurrentUser } from '@/lib/session';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { APP_NAME, PUBLIC_SITE_URL } from '@/lib/constants';

export async function generateMetadata({ params }: { params: Promise<{ userName: string }> }): Promise<Metadata> {
  const { userName } = await params;
  const data = await getAccountByAlias(userName, null);

  if (!data) return {};

  const { user, profilePhoto } = data;
  const profileImage = profilePhoto?.url;

  return {
    title: `'${user.alias} | ${APP_NAME}`,
    description: `${user.alias}-ის პროფილი ${APP_NAME}-ზე.`,
    alternates: {
      canonical: `https://${PUBLIC_SITE_URL}/account/${user.alias}`,
    },
    openGraph: {
      type: 'profile',
      title: `'${user.alias} (@${user.alias})`,
      description: `${user.alias}-ის პროფილი ${APP_NAME}-ზე`,
      url: `https://${PUBLIC_SITE_URL}/account/${user.alias}`,
      siteName: APP_NAME,
      images: profileImage ? [{
        url: profileImage,
        width: 400,
        height: 400,
        alt: `${user.alias}-ის პროფილის სურათი`,
      }] : undefined,
      username: user.alias,
    },
  };
}

export default async function AccountPage({ params }: { params: Promise<{ userName: string }> }) {
  const { userName } = await params;

  const payload = await getCurrentUser();
  const currentUserId = payload?.userId ?? null;

  const data = await getAccountByAlias(userName, currentUserId);
  if (!data) return notFound();

  return (
    <div>
      {currentUserId && (<Feed type='account-feed'
        userId={currentUserId}
        accountUserId={data.user.id} />)}
    </div>
  );
}
