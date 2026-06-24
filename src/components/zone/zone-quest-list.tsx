import ZoneQuestCard from './zone-quest-card';
import { PlusIcon, SettingsIcon } from '@/components/icons';
import type { QuestModerationSummaryType, ZoneQuestWithStatsType } from '@/types/quest';

export default function ZoneQuestList({
  quests,
  zoneSlug,
  canCreate = false,
  pendingModerationCount = 0,
  pendingModerationSummaries = [],
}: {
  quests: ZoneQuestWithStatsType[];
  zoneSlug: string;
  canCreate?: boolean;
  pendingModerationCount?: number;
  pendingModerationSummaries?: QuestModerationSummaryType[];
}) {
  const pendingByQuestId = new Map(pendingModerationSummaries.map((s) => [s.questId, s.pendingCount]));

  return (
    <div>
      {canCreate && (
        <div className="flex justify-end gap-2 mb-3">
          <a
            href={`/zone/${zoneSlug}/quests/moderation`}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-600 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <SettingsIcon className="w-4 h-4" />
            მოდერაცია
            {pendingModerationCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-red-600 text-white text-xs font-semibold">
                {pendingModerationCount}
              </span>
            )}
          </a>
          <a
            href={`/zone/${zoneSlug}/quests/new`}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition"
          >
            <PlusIcon className="w-4 h-4" />
            მისიის შექმნა
          </a>
        </div>
      )}

      {quests.length === 0 ? (
        <div className="p-6 text-zinc-500 dark:text-zinc-400">ჯერ არცერთი მისია არ არსებობს.</div>
      ) : (
        <div className="space-y-3">
          {quests.map((quest) => (
            <ZoneQuestCard
              key={quest.id}
              quest={quest}
              zoneSlug={zoneSlug}
              pendingReviewCount={pendingByQuestId.get(quest.id) ?? 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
