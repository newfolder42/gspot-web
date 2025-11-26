import FollowButton from '@/components/account/follow-button';
import Image from 'next/image';
import { formatAge } from '@/lib/formatAge';

export default function PublicView({ data }: { data: any }) {
  const user = data.user;
  const profilePhoto = data.profilePhoto;
  const isConnected = data.connection?.id;

  const initials = ((user.name || user.alias || '') as string)
    .split(' ')
    .map((s: string) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const hasProfilePhoto = profilePhoto && (profilePhoto.url);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white dark:bg-zinc-900 rounded-md p-6 border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-4">
          <div className="relative">
            {hasProfilePhoto ? (
              <Image src={profilePhoto.url} alt="Profile" width={20} height={20} className="h-20 w-20 rounded-full object-cover bg-zinc-100 dark:bg-zinc-800" />
            ) : (
              <div className="h-20 w-20 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-2xl font-semibold text-zinc-700 dark:text-zinc-200">{initials}</div>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{user.name ?? user.alias}</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">@{user.alias}</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">ასაკი: {formatAge(user.age)}</p>
            {!data.isOwnProfile && <FollowButton alias={user.alias} initialConnected={Boolean(isConnected)} />}
          </div>
        </div>

        <div className="mt-6">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">Profile</h2>
          <div className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
            <p><strong>სრული სახელი:</strong> {user.name ?? '-'}</p>
            <p className="mt-1"><strong>მომხმარებელი:</strong> @{user.alias}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
