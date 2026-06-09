import Link from 'next/link';
import TimePassed from '@/components/common/time-passed';
import FollowButton from '../account/follow-button';
import ProfileAvatar from '@/components/common/profileAvatar';

type Props = {
  alias: string;
  profilePhoto?: { url?: string | null } | null;
  createdAt: string;
  canUnfollow?: boolean;
  role?: string;
  status?: string;
};

const ROLE_LABELS: Record<string, string> = {
  owner: 'მფლობელი',
  admin: 'ადმინი',
  moderator: 'მოდერატორი',
  member: '',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'მოწვეული',
  active: '',
  left: 'დატოვა',
  banned: 'დაბლოკილი',
};

export default function ZoneMemberCard({ alias, profilePhoto, createdAt, canUnfollow = false, role, status }: Props) {
  const photoUrl = profilePhoto?.url || null;
  const roleLabel = role ? ROLE_LABELS[role] ?? '' : '';
  const statusLabel = status ? STATUS_LABELS[status] ?? '' : '';

  return (
    <div className="flex items-center p-3 border-b border-zinc-200 dark:border-zinc-800">
      <Link href={`/account/${alias}`} className="flex items-center gap-3 flex-1 min-w-0">
        <ProfileAvatar
          name={alias}
          photoUrl={photoUrl}
          className="h-12 w-12 rounded-md shrink-0"
          width={48}
          height={48}
        />
        <div className="truncate min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">&apos;{alias}</span>
            {roleLabel && (
              <span className="rounded-full border border-teal-200 bg-teal-50 px-1.5 py-0.5 text-xs font-medium text-teal-700 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-300">
                {roleLabel}
              </span>
            )}
            {statusLabel && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                {statusLabel}
              </span>
            )}
          </div>
          <TimePassed date={createdAt} className="text-xs text-zinc-500 dark:text-zinc-400" />
        </div>
      </Link>
      {canUnfollow && (
        <FollowButton alias={alias} initialConnected={Boolean(true)} />
      )}
    </div>
  );
}
