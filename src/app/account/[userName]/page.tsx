import OwnerView from '@/components/account/OwnerView';
import PublicView from '@/components/account/PublicView';
import { getAccountByAlias } from '@/lib/account';
import { getUserToken, getUserTokenAndValidate } from '@/lib/session';
import { notFound } from 'next/navigation';

export default async function AccountPage({ params }: { params: Promise<{ userName?: string }> }) {
  const { userName } = await params;

  let currentUserId = 0;
  try {
    const token = await getUserToken();
    if (token) {
      const payload = await getUserTokenAndValidate();
      currentUserId = payload.userId as number;
    }
  } catch (err) {
  }

  const data = await getAccountByAlias(userName ?? '', currentUserId);
  if (!data) return notFound();

  return (
    <div className="px-4">
      {data.isOwnProfile ? <OwnerView data={data} /> : <PublicView data={data} />}
    </div>
  );
}
