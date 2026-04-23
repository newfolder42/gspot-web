import Link from 'next/link';
import { getNewUsers, getTotalUsers } from '@/lib/users';
import { formatTimePassed } from '@/lib/dates';
import type { Metadata } from 'next';
import { APP_NAME, PUBLIC_SITE_URL } from '@/types/constants';
import { type NewUser } from '@/types/user';
import { LeaderboardIcon, TrophyIcon, ImageIcon } from '@/components/icons';
import ProfileAvatar from '@/components/common/profileAvatar';

export const metadata: Metadata = {
  title: `ახალი მომხმარებლები | ${APP_NAME}`,
  description: `აღმოაჩინე ${APP_NAME}-ზე ბოლოს დარეგისტრირებული მომხმარებლები.`,
  openGraph: {
    title: `ახალი მომხმარებლები | ${APP_NAME}`,
    description: `აღმოაჩინე ${APP_NAME}-ზე ბოლოს დარეგისტრირებული მომხმარებლები.`,
    type: 'website',
    url: `https://${PUBLIC_SITE_URL}/new-users`,
    siteName: APP_NAME,
  },
};

function UserCard({ user }: { user: NewUser }) {
  return (
    <Link
      href={`/account/${user.alias}`}
      className="group flex h-full flex-col rounded-xl border border-zinc-200 bg-white p-3 transition hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
    >
      <div className="flex items-start justify-between gap-2">
        <ProfileAvatar
          name={user.alias}
          photoUrl={user.profilePhoto?.url ?? null}
          className="h-12 w-12 shrink-0 rounded-md"
          width={56}
          height={56}
        />

        <div className="min-w-0 flex-1 text-right">
          <p className="truncate text-sm font-semibold leading-tight text-zinc-900 group-hover:underline dark:text-zinc-50">
            &apos;{user.alias}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {formatTimePassed(user.createdAt)}
          </p>
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-3 gap-1.5">
        <div className="flex items-center justify-center rounded-md border border-zinc-200/70 bg-zinc-50 px-1.5 py-1.5 dark:border-zinc-700 dark:bg-zinc-800/70">
          <div className="flex items-center gap-1 text-zinc-600 dark:text-zinc-300">
            <LeaderboardIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="text-xs font-bold tabular-nums text-zinc-900 dark:text-zinc-100">{user.level}</span>
          </div>
        </div>

        <div className="flex items-center justify-center rounded-md border border-zinc-200/70 bg-zinc-50 px-1.5 py-1.5 dark:border-zinc-700 dark:bg-zinc-800/70">
          <div className="flex items-center gap-1 text-zinc-600 dark:text-zinc-300">
            <TrophyIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="text-xs font-bold tabular-nums text-zinc-900 dark:text-zinc-100">{user.achievementsAchieved}</span>
          </div>
        </div>

        <div className="flex items-center justify-center rounded-md border border-zinc-200/70 bg-zinc-50 px-1.5 py-1.5 dark:border-zinc-700 dark:bg-zinc-800/70">
          <div className="flex items-center gap-1 text-zinc-600 dark:text-zinc-300">
            <ImageIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="text-xs font-bold tabular-nums text-zinc-900 dark:text-zinc-100">{user.postsCreated}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default async function NewUsersPage() {
  const [entries, totalUsers] = await Promise.all([getNewUsers(15, 0), getTotalUsers()]);

  return (
    <div className="mx-auto max-w-5xl px-2 py-4 md:px-4 md:py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-zinc-950 dark:text-zinc-50">ახალი მომხმარებლები</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          ბოლოს დარეგისტრირებული მომხმარებლები · სულ: {totalUsers}
        </p>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((e) => (
          <UserCard key={e.id} user={e} />
        ))}
      </div>
    </div>
  );
}
