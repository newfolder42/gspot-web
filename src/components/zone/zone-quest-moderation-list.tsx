import Link from 'next/link';
import ProfileAvatar from '@/components/common/profileAvatar';
import { FlagIcon } from '@/components/icons';
import type { QuestModerationSummaryType } from '@/types/quest';

function QuestModerationSummaryRow({ zoneSlug, summary }: { zoneSlug: string; summary: QuestModerationSummaryType }) {
  return (
    <Link
      href={`/zone/${zoneSlug}/quests/${summary.questId}/moderation`}
      className="flex items-center gap-3 p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 transition"
    >
      {summary.characterName ? (
        <ProfileAvatar
          name={summary.characterName}
          photoUrl={summary.characterAvatarUrl}
          className="h-10 w-10"
        />
      ) : (
        <div className="h-10 w-10 rounded-md bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center shrink-0">
          <FlagIcon className="w-5 h-5 text-teal-600 dark:text-teal-400" />
        </div>
      )}
      <span className="flex-1 min-w-0 text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
        {summary.questTitle}
      </span>
      <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-full bg-red-600 text-white text-xs font-semibold shrink-0">
        {summary.pendingCount}
      </span>
    </Link>
  );
}

export default function ZoneQuestModerationList({
  zoneSlug,
  summaries,
}: {
  zoneSlug: string;
  summaries: QuestModerationSummaryType[];
}) {
  if (summaries.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">განსახილველი ამოცანები არ არის.</p>;
  }

  return (
    <div className="space-y-3">
      {summaries.map((summary) => (
        <QuestModerationSummaryRow key={summary.questId} zoneSlug={zoneSlug} summary={summary} />
      ))}
    </div>
  );
}
