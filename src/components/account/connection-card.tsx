import Link from 'next/link';
import Image from 'next/image';
import FollowButton from './follow-button';
import { getInitials } from '@/lib/getInitials';

type Props = {
  alias: string;
  name?: string | null;
  profilePhoto?: { url?: string | null } | null;
  canUnfollow?: boolean;
};

export default function ConnectionCard({ alias, name, profilePhoto, canUnfollow = false }: Props) {
  const photoUrl = profilePhoto?.url || null;

  return (
    <div className="flex items-center gap-4 p-3 border rounded-md bg-white dark:bg-zinc-900">
      <Link href={`/account/${alias}`} className="flex items-center gap-3 flex-1">
        <div className="h-12 w-12 rounded-md overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
          {photoUrl ? (
            <Image src={photoUrl} alt={alias} width={48} height={48} className="h-12 w-12 object-cover" />
          ) : (
            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{getInitials(alias)}</span>
          )}
        </div>
        <div className="truncate">
          <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{name ?? alias}</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">@{alias}</div>
        </div>
      </Link>
      {canUnfollow && (
        <FollowButton alias={alias} initialConnected={Boolean(true)} />
      )}
    </div>
  );
}
