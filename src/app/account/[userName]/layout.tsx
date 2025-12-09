import Image from 'next/image';
import React from 'react';
import AccountTabs from '@/components/account/account-tabs';
import FollowButton from '@/components/account/follow-button';
import ProfilePhotoUpload from '@/components/profile-photo-upload';
import { getAccountByAlias } from '@/lib/account';
import { formatAge } from '@/lib/formatAge';
import { getLevelFromXp } from '@/lib/xp';
import { getCurrentUser } from '@/lib/session';
import { getInitials } from '@/lib/getInitials';

type Props = {
  children: React.ReactNode;
  params: Promise<{ userName: string }>;
};

export default async function UserLayout({ children, params }: Props) {
  const [{ userName }, currentUser] = await Promise.all([params, getCurrentUser()]);
  const account = await getAccountByAlias(userName, currentUser?.userId ?? null);

  if (!account) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="bg-white dark:bg-zinc-900 rounded-md p-6 border border-zinc-200 dark:border-zinc-800 flex gap-6">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">მომხმარებელი არ მოიძებნა</h1>
        </div>
      </div>
    );
  }

  const { user, profilePhoto, connection, isOwnProfile } = account;
  const tabs = [
    { id: 'overview', label: 'ძირითადი', href: `/account/${userName}` },
    { id: 'connections', label: 'კავშირები', href: `/account/${userName}/connections` },
  ];

  const initials = getInitials(user.alias);

  const hasProfilePhoto = Boolean(profilePhoto?.url);
  const joinedLabel = user.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '-';

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="bg-white dark:bg-zinc-900 rounded-md border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="p-6 pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex flex-row gap-4 items-center">
            <div className="relative flex items-center">
              <div className="relative h-20 w-20 rounded-md bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex items-center justify-center text-2xl font-semibold text-zinc-700 dark:text-zinc-200">
                {hasProfilePhoto ? (
                  <Image src={profilePhoto!.url} alt={`${user.alias} profile photo`} fill className="object-cover" sizes="80px" />
                ) : (
                  <span>{initials}</span>
                )}
                {isOwnProfile && (
                  <div className="absolute bottom-1 right-1 sm:bottom-1 sm:right-1">
                    <ProfilePhotoUpload userId={user.id} />
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 truncate">'{user.alias}</h1>
              <div className="mt-1 space-y-1 text-xs text-zinc-500 dark:text-zinc-500">
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">ასაკი: {formatAge(user.age)}</p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">დონე: {getLevelFromXp(4000).level}</p>
              </div>
            </div>

            {!isOwnProfile && (
              <div className="flex items-start">
                <FollowButton alias={user.alias} initialConnected={Boolean(connection?.id)} />
              </div>
            )}
          </div>
        </div>

        <div className="px-6 border-b border-zinc-200 dark:border-zinc-800">
          <AccountTabs tabs={tabs} />
        </div>

        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
