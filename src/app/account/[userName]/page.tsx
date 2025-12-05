import OwnerView from '@/components/account/account-owner-view';
import PublicView from '@/components/account/account-public-view';
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
      {data.isOwnProfile ? <OwnerView data={data} /> : <PublicView data={data} />}
    </div>
  );
}
