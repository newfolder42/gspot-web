import Feed from '@/components/feed';
import { getAccountByAlias } from '@/lib/account';
import { getCurrentUser } from '@/lib/session';
import { notFound } from 'next/navigation';

export default async function AccountPage({ params }: { params: Promise<{ userName: string }> }) {
  const { userName } = await params;

  const payload = await getCurrentUser();
  const currentUserId = payload?.userId ?? null;

  const data = await getAccountByAlias(userName, currentUserId);
  if (!data) return notFound();

  return (
    <div className="px-4">
      {currentUserId && (<Feed type='account-feed'
        userId={currentUserId}
        accountUserId={data.user.id} />)}
    </div>
  );
}
