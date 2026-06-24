import type { ZoneQuestObjectiveWithProgressType } from '@/types/quest';

export function isObjectiveAttemptable(
  objectives: ZoneQuestObjectiveWithProgressType[],
  objectiveOrder: string,
  objectiveId: number
): boolean {
  const target = objectives.find((o) => o.id === objectiveId);
  if (!target) return false;
  if (target.progressStatus === 'completed' || target.progressStatus === 'pending_review') return false;
  if (objectiveOrder !== 'ordered') return true;

  const sorted = [...objectives].sort((a, b) => a.sort_order - b.sort_order);
  for (const obj of sorted) {
    if (obj.id === objectiveId) return true;
    if (obj.progressStatus !== 'completed') return false;
  }
  return false;
}

export function getQuestLockReason(input: {
  startDate: string | null;
  endDate: string | null;
  requiredLevel: number | null;
  callerLevel: number;
}): string | null {
  const now = Date.now();
  if (input.startDate && now < new Date(input.startDate).getTime()) {
    return 'მისია ჯერ არ დაწყებულა';
  }
  if (input.endDate && now > new Date(input.endDate).getTime()) {
    return 'მისიის ვადა ამოიწურა';
  }
  if (input.requiredLevel && input.callerLevel < input.requiredLevel) {
    return `საჭიროა მინიმუმ ${input.requiredLevel} დონე`;
  }
  return null;
}
