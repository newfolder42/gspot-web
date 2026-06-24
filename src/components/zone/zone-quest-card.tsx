import Link from 'next/link';
import ProfileAvatar from '@/components/common/profileAvatar';
import { FlagIcon, CheckmarkCircleIcon, LockIcon, UsersIcon } from '@/components/icons';
import type { ZoneQuestWithStatsType } from '@/types/quest';

export default function ZoneQuestCard({
  quest,
  zoneSlug,
  pendingReviewCount = 0,
}: {
  quest: ZoneQuestWithStatsType;
  zoneSlug: string;
  pendingReviewCount?: number;
}) {
  const isLocked = !quest.myStatus && Boolean(quest.lockReason);
  const isCompletedByMe = quest.myStatus === 'completed';

  return (
    <Link
      href={`/zone/${zoneSlug}/quests/${quest.id}`}
      scroll={false}
      className={`flex items-center gap-3 p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 transition ${isLocked ? 'opacity-60' : ''}`}
    >
      {quest.characterName ? (
        <ProfileAvatar
          name={quest.characterName}
          photoUrl={quest.characterAvatarUrl}
          className="h-10 w-10"
        />
      ) : (
        <div className="h-10 w-10 rounded-md bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center shrink-0">
          <FlagIcon className="w-5 h-5 text-teal-600 dark:text-teal-400" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{quest.title}</span>
          {isCompletedByMe && <CheckmarkCircleIcon className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />}
          {quest.myStatus === 'active' && (
            <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 px-1.5 py-0.5 rounded">
              აქტიური
            </span>
          )}
          {isLocked && (
            <span className="shrink-0" title={quest.lockReason ?? undefined}>
              <LockIcon className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          <span>{quest.objectiveCount} ამოცანა</span>
          <span className="inline-flex items-center gap-1">
            <UsersIcon className="w-3.5 h-3.5" />
            {quest.activeCount}
          </span>
          <span className="inline-flex items-center gap-1">
            <FlagIcon className="w-3.5 h-3.5" />
            {quest.completedCount}
          </span>
          {quest.required_level != null && <span>დონე {quest.required_level}+</span>}
        </div>
      </div>

      {pendingReviewCount > 0 && (
        <span className="shrink-0 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-red-600 text-white text-xs font-semibold">
          {pendingReviewCount}
        </span>
      )}
    </Link>
  );
}
