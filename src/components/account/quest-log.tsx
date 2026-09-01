import Link from 'next/link';
import ProfileAvatar from '@/components/common/profileAvatar';
import { FlagIcon, LockIcon, UsersIcon } from '@/components/icons';
import type { AvailableQuestType, UserQuestLogEntryType } from '@/types/quest';

const STATUS_LABELS: Record<string, string> = {
  active: 'მიმდინარე',
};

const STATUS_CLASSES: Record<string, string> = {
  active: 'border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300',
};

function QuestAvatar({ characterName, characterAvatarUrl }: { characterName: string | null; characterAvatarUrl: string | null }) {
  if (characterName) {
    return <ProfileAvatar name={characterName} photoUrl={characterAvatarUrl} className="h-10 w-10" />;
  }
  return (
    <div className="h-10 w-10 rounded-md bg-gradient-to-br from-amber-400 to-amber-600 dark:from-amber-600 dark:to-amber-800 flex items-center justify-center shrink-0">
      <FlagIcon className="w-5 h-5 text-white" />
    </div>
  );
}

function QuestLogRow({ entry }: { entry: UserQuestLogEntryType }) {
  const isCompleted = entry.status === 'completed';

  return (
    <Link
      href={`/zone/${entry.zoneSlug}/quests/${entry.questId}`}
      scroll={false}
      className={`flex items-center gap-3 p-3 border rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 transition ${
        isCompleted ? 'border-teal-200 dark:border-teal-800 bg-teal-50/30 dark:bg-teal-950/10' : 'border-zinc-200 dark:border-zinc-800'
      }`}
    >
      <QuestAvatar characterName={entry.characterName} characterAvatarUrl={entry.characterAvatarUrl} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{entry.questTitle}</span>
          {!isCompleted && STATUS_LABELS[entry.status] && (
            <span className={`rounded-full border px-1.5 py-0.5 text-xs font-medium ${STATUS_CLASSES[entry.status]}`}>
              {STATUS_LABELS[entry.status]}
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">{entry.zoneName}</p>
        {!isCompleted && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {entry.completedObjectiveCount}/{entry.objectiveCount} ამოცანა დასრულებულია
          </p>
        )}
      </div>
    </Link>
  );
}

function AvailableQuestRow({ quest }: { quest: AvailableQuestType }) {
  const isLocked = Boolean(quest.lockReason);

  return (
    <Link
      href={`/zone/${quest.zoneSlug}/quests/${quest.questId}`}
      scroll={false}
      className={`flex items-center gap-3 p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 transition ${
        isLocked ? 'opacity-60' : ''
      }`}
    >
      <QuestAvatar characterName={quest.characterName} characterAvatarUrl={quest.characterAvatarUrl} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{quest.questTitle}</span>
          {isLocked && (
            <span className="shrink-0" title={quest.lockReason ?? undefined}>
              <LockIcon className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">{quest.zoneName}</p>
        {isLocked ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">{quest.lockReason}</p>
        ) : (
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
          </div>
        )}
      </div>
    </Link>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

export default function QuestLog({
  entries,
  available = [],
}: {
  entries: UserQuestLogEntryType[];
  available?: AvailableQuestType[];
}) {
  const current = entries.filter((e) => e.status !== 'completed');
  const completed = entries.filter((e) => e.status === 'completed');

  if (current.length === 0 && completed.length === 0 && available.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-zinc-500 dark:text-zinc-400">
        <FlagIcon className="w-10 h-10 text-zinc-300 dark:text-zinc-700" />
        <p className="text-sm">მისიები არ გაქვს აღებული</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {current.length > 0 && (
        <Section title="მიმდინარე">
          {current.map((entry) => (
            <QuestLogRow key={entry.userQuestId} entry={entry} />
          ))}
        </Section>
      )}

      {available.length > 0 && (
        <Section title="ხელმისაწვდომი">
          {available.map((quest) => (
            <AvailableQuestRow key={quest.questId} quest={quest} />
          ))}
        </Section>
      )}

      {completed.length > 0 && (
        <Section title="დასრულებული">
          {completed.map((entry) => (
            <QuestLogRow key={entry.userQuestId} entry={entry} />
          ))}
        </Section>
      )}
    </div>
  );
}
