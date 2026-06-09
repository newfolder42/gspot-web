import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/session';
import { getUserLevel } from '@/lib/users';
import { MIN_LEVEL_CREATE_ZONE } from '@/lib/permissions';
import NewZoneForm from '@/components/zone/new-zone-form';
import { APP_NAME } from '@/types/constants';

export const metadata: Metadata = {
  title: `ახალი საბზონა | ${APP_NAME}`,
};

export default async function NewZonePage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect('/auth/signin?redirect=/new-zone');

  const userLevel = await getUserLevel(currentUser.userId);

  if (userLevel < MIN_LEVEL_CREATE_ZONE) {
    return (
      <div className="max-w-lg mx-auto py-10 px-4">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-3">ახალი საბზონა</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          საბზონის შექმნისთვის საჭიროა {MIN_LEVEL_CREATE_ZONE} დონე.
          შენი მიმდინარე დონეა{' '}
          <span className="font-semibold text-zinc-900 dark:text-zinc-50">{userLevel}</span>.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto py-10 px-4">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-6">ახალი საბზონა</h1>
      <NewZoneForm />
    </div>
  );
}
