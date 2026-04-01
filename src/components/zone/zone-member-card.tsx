import Link from 'next/link';
import Image from 'next/image';
import { getInitials } from '@/lib/getInitials';
import { formatTimePassed } from '@/lib/dates';
import FollowButton from '../account/follow-button';

type Props = {
  alias: string;
  profilePhoto?: { url?: string | null } | null;
  createdAt: string;
  canUnfollow?: boolean;
};

export default function ZoneMemberCard({ alias, profilePhoto, createdAt, canUnfollow = false }: Props) {
  const photoUrl = profilePhoto?.url || null;

  return (
    <div className="flex items-center p-3 border-b border-zinc-200 dark:border-zinc-800">
      <Link href={`/account/${alias}`} className="flex items-center gap-3 flex-1">
        <div className="h-12 w-12 rounded-md overflow-hidden flex items-center justify-center">
          {photoUrl ? (
            <Image src={photoUrl} alt={alias} width={48} height={48} className="h-12 w-12 object-cover" />
          ) : (
            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{getInitials(alias)}</span>
          )}
        </div>
        <div className="truncate">
          <div className="text-sm font-medium">
            <span className="ml-1 text-zinc-900 dark:text-zinc-100">&apos;{alias}</span>
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">{formatTimePassed(createdAt)}</div>
        </div>
      </Link>
      {canUnfollow && (
        <FollowButton alias={alias} initialConnected={Boolean(true)} />
      )}
    </div>
  );
}
