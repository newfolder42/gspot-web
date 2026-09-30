import { RepeatIcon } from '@/components/icons';
import { QUEST_REPEATABILITY_LABELS } from '@/types/quest';
import type { QuestRepeatability } from '@/types/quest';

// Tells players a quest can be taken again; one-time quests render nothing.
export default function QuestRepeatabilityBadge({ repeatability }: { repeatability: QuestRepeatability }) {
  const label = QUEST_REPEATABILITY_LABELS[repeatability];
  if (!label) return null;

  return (
    <span className="shrink-0 inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-xs font-medium text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300">
      <RepeatIcon className="w-3 h-3" />
      {label}
    </span>
  );
}
