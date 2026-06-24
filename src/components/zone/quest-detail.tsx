"use client";

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProfileAvatar from '@/components/common/profileAvatar';
import { acceptQuestAction } from '@/actions/quests';
import { isObjectiveAttemptable } from '@/lib/questProgress';
import { formatPhotoTakenDate } from '@/lib/dates';
import QuestObjectiveCapture from './quest-objective-capture';
import QuestCompletedGallery from './quest-completed-gallery';
import { CameraIcon, CheckmarkCircleIcon, LockIcon, CalendarIcon, FlagIcon } from '@/components/icons';
import type {
  ZoneQuestBaseType,
  ZoneQuestObjectiveWithProgressType,
  UserQuestBaseType,
  CompletedQuestPhotoType,
  ZoneQuestCharacterType,
} from '@/types/quest';

const OBJECTIVE_STATUS_LABELS: Record<string, string> = {
  pending_review: 'განხილვაში',
  rejected: 'დაიწუნა',
  completed: 'შესრულებულია',
};

function ObjectiveRow({
  objective,
  index,
  attemptable,
  hasUserQuest,
  userQuestId,
  isMobile,
  onCapture,
}: {
  objective: ZoneQuestObjectiveWithProgressType;
  index: number;
  attemptable: boolean;
  hasUserQuest: boolean;
  userQuestId: number | null;
  isMobile: boolean;
  onCapture: (objectiveId: number) => void;
}) {
  const status = objective.progressStatus;
  const statusLabel = status ? OBJECTIVE_STATUS_LABELS[status] : null;
  const isLocked = hasUserQuest && !status && !attemptable;
  const isCompleted = status === 'completed';
  const isCapturable = hasUserQuest && userQuestId != null && attemptable && status !== 'pending_review' && status !== 'completed';
  const requiresMobile = objective.type === 'in_range_location' && !isMobile;
  const canCapture = isCapturable && !requiresMobile;

  return (
    <div className={`flex items-start gap-3 py-3 ${isLocked ? 'opacity-50' : ''}`}>
      <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mt-0.5 ${
        isCompleted ? 'bg-teal-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
      }`}>
        {isCompleted ? <CheckmarkCircleIcon className="w-3.5 h-3.5" /> : isLocked ? <LockIcon className="w-3 h-3" /> : index + 1}
      </div>

      <div className="min-w-0 flex-1 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {objective.title && (
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{objective.title}</span>
            )}
            {statusLabel && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">· {statusLabel}</span>
            )}
            {isLocked && (
              <span className="text-xs text-zinc-400 dark:text-zinc-500">· დაბლოკილია</span>
            )}
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-0.5">{objective.display_text}</p>
          {status === 'rejected' && objective.rejectionReason && (
            <p className="text-xs text-red-500 mt-1">მიზეზი: {objective.rejectionReason}</p>
          )}
        </div>

        {canCapture && (
          <button
            type="button"
            onClick={() => onCapture(objective.id)}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-teal-600 text-white text-xs font-medium hover:bg-teal-700"
          >
            <CameraIcon className="w-3.5 h-3.5" />
            ფოტო
          </button>
        )}

        {isCapturable && requiresMobile && (
          <span className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500 text-right">
            ხელმისაწვდომია მხოლოდ მობილურიდან
          </span>
        )}
      </div>
    </div>
  );
}

export default function QuestDetail({
  zoneSlug,
  quest,
  character,
  lockReason,
  objectives,
  userQuest,
  isAuthenticated,
  canAccept,
  canModerate,
  gallery,
  isMobile,
  highlightAuthorAlias,
}: {
  zoneSlug: string;
  quest: ZoneQuestBaseType;
  character: ZoneQuestCharacterType | null;
  lockReason: string | null;
  objectives: ZoneQuestObjectiveWithProgressType[];
  userQuest: UserQuestBaseType | null;
  isAuthenticated: boolean;
  canAccept: boolean;
  canModerate: boolean;
  gallery: CompletedQuestPhotoType[];
  isMobile: boolean;
  highlightAuthorAlias?: string | null;
}) {
  const router = useRouter();
  const [isAccepting, startAccepting] = useTransition();
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [captureObjectiveId, setCaptureObjectiveId] = useState<number | null>(null);

  function handleAccept() {
    setAcceptError(null);
    startAccepting(async () => {
      const result = await acceptQuestAction(quest.id);
      if (!result.success) {
        setAcceptError(result.error ?? 'შეცდომა');
        return;
      }
      router.refresh();
    });
  }

  const captureObjective = captureObjectiveId != null
    ? objectives.find((o) => o.id === captureObjectiveId) ?? null
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        {character ? (
          <ProfileAvatar
            name={character.name}
            photoUrl={character.avatar_url}
            className="shrink-0 w-11 h-11 rounded-full"
          />
        ) : (
          <div className="shrink-0 w-11 h-11 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            <FlagIcon className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {character ? character.name : 'ზონის მისია'}
          </p>
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{quest.title}</h1>
            {quest.required_level && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                დონე {quest.required_level}+
              </span>
            )}
          </div>
          {quest.description && (
            <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-1.5">{quest.description}</p>
          )}
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 mt-2">
            <FlagIcon className="w-3.5 h-3.5" />
            ჯილდო · 200 გამოცდილება
          </div>
          {(quest.start_date || quest.end_date) && (
            <p className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              <CalendarIcon className="w-3.5 h-3.5" />
              {quest.start_date && quest.end_date
                ? `${formatPhotoTakenDate(quest.start_date)} - ${formatPhotoTakenDate(quest.end_date)}`
                : quest.start_date
                  ? `იწყება ${formatPhotoTakenDate(quest.start_date)}`
                  : `მთავრდება ${formatPhotoTakenDate(quest.end_date)}`}
            </p>
          )}
        </div>
      </div>

      {!userQuest && lockReason && (
        <div className="flex items-start gap-2 text-sm text-zinc-500 dark:text-zinc-400">
          <LockIcon className="w-4 h-4 shrink-0 mt-0.5" />
          {lockReason}
        </div>
      )}

      {userQuest?.status === 'completed' && (
        <div className="flex items-center gap-2 text-sm text-teal-600 dark:text-teal-400">
          <CheckmarkCircleIcon className="w-4 h-4" />
          მისია შესრულებულია!
        </div>
      )}

      {!userQuest && (
        <div>
          {canAccept ? (
            <>
              <button
                type="button"
                onClick={handleAccept}
                disabled={isAccepting}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-6 py-2.5 transition"
              >
                <FlagIcon className="w-4 h-4" />
                {isAccepting ? 'მიმდინარეობს...' : 'მისიის აღება'}
              </button>
              {acceptError && <p className="text-sm text-red-500 mt-2">{acceptError}</p>}
            </>
          ) : !isAuthenticated ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              მისიის შესასრულებლად{' '}
              <Link href={`/auth/signin?redirect=/zone/${zoneSlug}/quests/${quest.id}`} className="text-teal-600 dark:text-teal-400 underline">
                გაიარე ავტორიზაცია
              </Link>.
            </p>
          ) : !canModerate && !lockReason ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">მისიის შესასრულებლად საბზონის წევრი უნდა იყო.</p>
          ) : null}
        </div>
      )}

      <div>
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
          ამოცანები · {objectives.filter((o) => o.progressStatus === 'completed').length}/{objectives.length}
          {quest.objective_order === 'ordered' && <span> · თანმიმდევრობით</span>}
        </p>
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {objectives.map((objective, idx) => (
            <ObjectiveRow
              key={objective.id}
              objective={objective}
              index={idx}
              attemptable={isObjectiveAttemptable(objectives, quest.objective_order, objective.id)}
              hasUserQuest={Boolean(userQuest) && userQuest?.status === 'active'}
              userQuestId={userQuest?.id ?? null}
              isMobile={isMobile}
              onCapture={setCaptureObjectiveId}
            />
          ))}
        </div>
      </div>

      {(userQuest?.status === 'completed' || Boolean(highlightAuthorAlias)) && (
        <QuestCompletedGallery photos={gallery} highlightAlias={highlightAuthorAlias} />
      )}

      {captureObjective && userQuest && (
        <QuestObjectiveCapture
          userQuestId={userQuest.id}
          objectiveId={captureObjective.id}
          type={captureObjective.type}
          config={captureObjective.config}
          onClose={() => setCaptureObjectiveId(null)}
          onSubmitted={() => {
            setCaptureObjectiveId(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
