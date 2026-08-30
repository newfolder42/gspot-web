import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import HideAndSeekList from '@/components/hide-and-seek/hide-and-seek-list';
import { getCurrentUser } from '@/lib/session';
import { listHideAndSeekGamesForUser } from '@/lib/hideAndSeek';
import type { HideAndSeekListFilter } from '@/types/hide-and-seek';

export const metadata = {
  title: "დამალობანა | G'spot",
  description: 'მიმდინარე და დასრულებული დამალობანები.',
};

type Props = { searchParams: Promise<{ filter?: string }> };

export default async function Page({ searchParams }: Props) {
  const [{ filter: rawFilter }, currentUser] = await Promise.all([searchParams, getCurrentUser()]);
  if (!currentUser) return redirect('/auth/signin');

  const filter: HideAndSeekListFilter =
    rawFilter === 'active' || rawFilter === 'ended' ? rawFilter : 'all';

  const games = await listHideAndSeekGamesForUser(currentUser.userId, filter);

  return (
    <div className="max-w-3xl mx-auto p-2 sm:p-4">
      <Suspense fallback={null}>
        <HideAndSeekList games={games} filter={filter} />
      </Suspense>
    </div>
  );
}
