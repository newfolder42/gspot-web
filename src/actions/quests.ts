"use server"

import { headers } from 'next/headers';
import { logerror } from '@/lib/logger';
import { getZoneMember as getZoneMemberLib, getZoneById as getZoneByIdLib } from '@/lib/zones';
import { getCurrentUser } from '@/lib/session';
import { haversineMeters } from '@/lib/gpsPhotoGuessScore';
import { getUserLevel } from '@/lib/users';
import { getQuestLockReason } from '@/lib/questProgress';
import { isMobileUserAgent } from '@/lib/device';
import { processUploadedPhoto } from '@/lib/image-pipeline';
import {
  getQuestById as getQuestByIdLib,
  getObjectiveById as getObjectiveByIdLib,
  getQuestObjectivesWithProgress as getQuestObjectivesWithProgressLib,
  getUserQuest as getUserQuestLib,
  getUserQuestById as getUserQuestByIdLib,
  createQuest as createQuestLib,
  createQuestObjectives as createQuestObjectivesLib,
  acceptQuest as acceptQuestLib,
  submitObjectiveCapture as submitObjectiveCaptureLib,
  getObjectiveReviewContext as getObjectiveReviewContextLib,
  reviewObjective as reviewObjectiveLib,
  allObjectivesCompleted as allObjectivesCompletedLib,
  completeQuest as completeQuestLib,
  getZoneQuestCharacters as getZoneQuestCharactersLib,
  createQuestCharacter as createQuestCharacterLib,
  getUserQuestCompletionSummary as getUserQuestCompletionSummaryLib,
} from '@/lib/quests';
import { isObjectiveAttemptable } from '@/lib/questProgress';
import { createQuestCompletionPost as createQuestCompletionPostLib } from '@/lib/posts';
import type { ObjectiveTypeId, InRangeLocationConfig, CaptureData, ZoneQuestCharacterType } from '@/types/quest';
import type { QuestCompletedEvent } from '@/types/events/quest-completed';

export type QuestObjectiveOrder = 'ordered' | 'unordered';
export type ReviewDecision = 'approve' | 'reject';
export type CaptureMethod = 'exif' | 'live_gps';

export type CreateQuestObjectiveActionInput = {
  title?: string | null;
  displayText: string;
  type: ObjectiveTypeId;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
};

export type CreateQuestActionInput = {
  title: string;
  description: string | null;
  objectiveOrder: QuestObjectiveOrder;
  objectives: CreateQuestObjectiveActionInput[];
  characterId?: number | null;
  requiredLevel?: number | null;
  startDate?: string | null;
  endDate?: string | null;
};

export async function createQuestAction(
  zoneId: number,
  input: CreateQuestActionInput
): Promise<{ success: boolean; questId?: number; error?: string }> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return { success: false, error: 'არ ხარ ავტორიზებული' };

    const member = await getZoneMemberLib(zoneId, currentUser.userId);
    if (!member || !['owner', 'admin', 'moderator'].includes(member.role)) {
      return { success: false, error: 'უფლება არ გაქვს' };
    }

    const title = input.title.trim();
    if (!title) return { success: false, error: 'სათაური სავალდებულოა' };

    if (!input.objectives || input.objectives.length === 0) {
      return { success: false, error: 'მინიმუმ ერთი ამოცანა საჭიროა' };
    }

    for (const obj of input.objectives) {
      if (!obj.displayText?.trim()) return { success: false, error: 'ყველა ამოცანას უნდა ჰქონდეს აღწერა' };
      if (obj.type === 'in_range_location') {
        if (typeof obj.latitude !== 'number' || typeof obj.longitude !== 'number' || Number.isNaN(obj.latitude) || Number.isNaN(obj.longitude)) {
          return { success: false, error: 'ამოცანას არ აქვს მითითებული ლოკაცია' };
        }
        if (!obj.radiusMeters || obj.radiusMeters <= 0) {
          return { success: false, error: 'არასწორი რადიუსი' };
        }
      } else if (obj.type !== 'capture_photo') {
        return { success: false, error: 'ამოცანის ტიპი არასწორია' };
      }
    }

    if (!input.characterId) {
      return { success: false, error: 'პერსონაჟის შერჩევა სავალდებულოა' };
    }
    const characters = await getZoneQuestCharactersLib(zoneId);
    if (!characters.some((c) => c.id === input.characterId)) {
      return { success: false, error: 'პერსონაჟი არ მოიძებნა' };
    }

    if (input.startDate && input.endDate && new Date(input.endDate).getTime() < new Date(input.startDate).getTime()) {
      return { success: false, error: 'დასასრულის თარიღი არ შეიძლება დაწყებამდე იყოს' };
    }

    const quest = await createQuestLib({
      zoneId,
      title,
      description: input.description?.trim() || null,
      objectiveOrder: input.objectiveOrder,
      createdBy: currentUser.userId,
      characterId: input.characterId ?? null,
      requiredLevel: input.requiredLevel ?? null,
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
    });
    if (!quest) return { success: false, error: 'შეცდომა მისიის შექმნისას' };

    const created = await createQuestObjectivesLib(
      quest.id,
      input.objectives.map((o) => ({
        title: o.title?.trim() || null,
        displayText: o.displayText.trim(),
        type: o.type,
        config:
          o.type === 'in_range_location'
            ? ({ latitude: o.latitude, longitude: o.longitude, radiusMeters: Math.round(o.radiusMeters!) } as InRangeLocationConfig)
            : {},
      }))
    );
    if (!created) return { success: false, error: 'შეცდომა ამოცანების შექმნისას' };

    return { success: true, questId: quest.id };
  } catch (err) {
    await logerror('createQuestAction error', [err]);
    return { success: false, error: 'გაურკვეველი შეცდომა' };
  }
}

export type CreateQuestCharacterActionInput = {
  name: string;
  avatarUrl?: string | null;
  description?: string | null;
};

export async function createQuestCharacterAction(
  zoneId: number,
  input: CreateQuestCharacterActionInput
): Promise<{ success: boolean; character?: ZoneQuestCharacterType; error?: string }> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return { success: false, error: 'არ ხარ ავტორიზებული' };

    const member = await getZoneMemberLib(zoneId, currentUser.userId);
    if (!member || !['owner', 'admin', 'moderator'].includes(member.role)) {
      return { success: false, error: 'უფლება არ გაქვს' };
    }

    const name = input.name.trim();
    if (!name) return { success: false, error: 'სახელი სავალდებულოა' };

    const character = await createQuestCharacterLib({
      zoneId,
      name,
      avatarUrl: input.avatarUrl?.trim() || null,
      description: input.description?.trim() || null,
      createdBy: currentUser.userId,
    });
    if (!character) return { success: false, error: 'შეცდომა პერსონაჟის შექმნისას' };

    return { success: true, character };
  } catch (err) {
    await logerror('createQuestCharacterAction error', [err]);
    return { success: false, error: 'გაურკვეველი შეცდომა' };
  }
}

export async function acceptQuestAction(questId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return { success: false, error: 'არ ხარ ავტორიზებული' };

    const quest = await getQuestByIdLib(questId);
    if (!quest || quest.status !== 'active') return { success: false, error: 'მისია არ მოიძებნა' };

    const member = await getZoneMemberLib(quest.zone_id, currentUser.userId);
    if (!member || member.status !== 'active') return { success: false, error: 'საბზონის წევრი არ ხარ' };
    if (member.role !== 'member') return { success: false, error: 'პერსონალს მისიების შესრულება არ შეუძლია' };

    const existing = await getUserQuestLib(questId, currentUser.userId);
    if (existing) return { success: false, error: 'მისია უკვე აღებულია' };

    const callerLevel = await getUserLevel(currentUser.userId);
    const lockReason = getQuestLockReason({
      startDate: quest.start_date,
      endDate: quest.end_date,
      requiredLevel: quest.required_level,
      callerLevel,
    });
    if (lockReason) return { success: false, error: lockReason };

    const ok = await acceptQuestLib(questId, currentUser.userId);
    if (!ok) return { success: false, error: 'შეცდომა მისიის აღებისას' };

    const { eventBus } = await import('@/lib/eventBus');
    await eventBus.publish('zone_quest', 'accepted', {
      questId,
      zoneId: quest.zone_id,
      userId: currentUser.userId,
    });

    return { success: true };
  } catch (err) {
    await logerror('acceptQuestAction error', [err]);
    return { success: false, error: 'გაურკვეველი შეცდომა' };
  }
}

export type SubmitCaptureActionInput = {
  photoUrl: string;
  captureMethod?: CaptureMethod;
  capturedLatitude?: number;
  capturedLongitude?: number;
};

export async function submitObjectiveCaptureAction(
  userQuestId: number,
  objectiveId: number,
  capture: SubmitCaptureActionInput
): Promise<{ success: boolean; error?: string; distanceMeters?: number; inRange?: boolean }> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return { success: false, error: 'არ ხარ ავტორიზებული' };

    const userQuest = await getUserQuestByIdLib(userQuestId);
    if (!userQuest || userQuest.user_id !== currentUser.userId) {
      return { success: false, error: 'მისია არ მოიძებნა' };
    }
    if (userQuest.status === 'completed') {
      return { success: false, error: 'მისია უკვე დასრულებულია' };
    }

    const objective = await getObjectiveByIdLib(objectiveId);
    if (!objective || objective.quest_id !== userQuest.quest_id) {
      return { success: false, error: 'ამოცანა არ მოიძებნა' };
    }

    const quest = await getQuestByIdLib(userQuest.quest_id);
    if (!quest) return { success: false, error: 'მისია არ მოიძებნა' };

    const objectivesWithProgress = await getQuestObjectivesWithProgressLib(quest.id, userQuestId);
    if (!isObjectiveAttemptable(objectivesWithProgress, quest.objective_order, objectiveId)) {
      return { success: false, error: 'ეს ამოცანა ჯერ ხელმისაწვდომი არ არია' };
    }

    let captureData: CaptureData = {};
    let distanceMeters: number | undefined;

    if (objective.type === 'in_range_location') {
      const userAgent = (await headers()).get('user-agent');
      if (!isMobileUserAgent(userAgent)) {
        return { success: false, error: 'ეს ამოცანა ხელმისაწვდომია მხოლოდ მობილური მოწყობილობიდან' };
      }

      const config = objective.config as InRangeLocationConfig;
      if (typeof capture.capturedLatitude !== 'number' || typeof capture.capturedLongitude !== 'number') {
        return { success: false, error: 'ლოკაცია არ მოიძებნა' };
      }
      distanceMeters = haversineMeters(
        { latitude: capture.capturedLatitude, longitude: capture.capturedLongitude },
        { latitude: config.latitude, longitude: config.longitude }
      );
      if (distanceMeters > config.radiusMeters) {
        return { success: false, error: 'ლოკაცია არ ემთხვევა, უფრო ახლოს მიდი', distanceMeters, inRange: false };
      }
      captureData = {
        capturedLatitude: capture.capturedLatitude,
        capturedLongitude: capture.capturedLongitude,
        distanceMeters,
        captureMethod: capture.captureMethod,
      };
    }

    let photoUrl = capture.photoUrl;
    const processed = await processUploadedPhoto(capture.photoUrl);
    if (processed) {
      photoUrl = processed.displayUrl;
      captureData = { ...captureData, variants: processed.variants };
    }
    // On failure, fall back to the original upload URL with no variants.

    const ok = await submitObjectiveCaptureLib(userQuestId, objectiveId, {
      photoUrl,
      captureData,
    });
    if (!ok) return { success: false, error: 'შეცდომა გაგზავნისას' };

    const zone = await getZoneByIdLib(quest.zone_id);

    const { eventBus } = await import('@/lib/eventBus');
    await eventBus.publish('zone_quest_objective', 'submitted', {
      objectiveId,
      objectiveTitle: objective.title,
      questId: quest.id,
      questTitle: quest.title,
      zoneId: quest.zone_id,
      zoneSlug: zone?.slug ?? '',
      userId: currentUser.userId,
      userAlias: currentUser.alias,
    });

    return { success: true, distanceMeters, inRange: objective.type === 'in_range_location' ? true : undefined };
  } catch (err) {
    await logerror('submitObjectiveCaptureAction error', [err]);
    return { success: false, error: 'გაურკვეველი შეცდომა' };
  }
}

export async function reviewObjectiveAction(
  userQuestObjectiveId: number,
  decision: ReviewDecision,
  rejectionReason?: string
): Promise<{ success: boolean; error?: string; allObjectivesDone?: boolean }> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return { success: false, error: 'არ ხარ ავტორიზებული' };

    const context = await getObjectiveReviewContextLib(userQuestObjectiveId);
    if (!context || context.status !== 'pending_review') {
      return { success: false, error: 'მოლოდინში არსებული ჩანაწერი არ მოიძებნა' };
    }

    const member = await getZoneMemberLib(context.zoneId, currentUser.userId);
    if (!member || !['owner', 'admin', 'moderator'].includes(member.role)) {
      return { success: false, error: 'უფლება არ გაქვს' };
    }

    const ok = await reviewObjectiveLib(userQuestObjectiveId, currentUser.userId, decision, rejectionReason ?? null);
    if (!ok) return { success: false, error: 'შეცდომა შეფასებისას' };

    const [objective, zone] = await Promise.all([
      getObjectiveByIdLib(context.objectiveId),
      getZoneByIdLib(context.zoneId),
    ]);
    const { eventBus } = await import('@/lib/eventBus');

    if (decision === 'reject') {
      await eventBus.publish('zone_quest_objective', 'rejected', {
        objectiveId: context.objectiveId,
        objectiveTitle: objective?.title ?? null,
        questId: context.questId,
        zoneId: context.zoneId,
        zoneSlug: zone?.slug ?? '',
        userId: context.submitterId,
        rejectionReason: rejectionReason ?? null,
      });
      return { success: true };
    }

    await eventBus.publish('zone_quest_objective', 'accepted', {
      objectiveId: context.objectiveId,
      objectiveTitle: objective?.title ?? null,
      questId: context.questId,
      zoneId: context.zoneId,
      zoneSlug: zone?.slug ?? '',
      userId: context.submitterId,
    });

    const allDone = await allObjectivesCompletedLib(context.userQuestId);
    if (allDone) {
      await completeQuestLib(context.userQuestId);

      const [quest, objectives] = await Promise.all([
        getQuestByIdLib(context.questId),
        getUserQuestCompletionSummaryLib(context.userQuestId),
      ]);

      const questTitle = quest?.title ?? '';
      const zoneSlug = zone?.slug ?? '';

      await createQuestCompletionPostLib({
        userId: context.submitterId,
        userAlias: context.submitterAlias,
        zoneId: context.zoneId,
        zoneSlug,
        questId: context.questId,
        objectives,
      });

      await eventBus.publish<QuestCompletedEvent>('zone_quest', 'completed', {
        questId: context.questId,
        questTitle,
        zoneId: context.zoneId,
        zoneSlug,
        userId: context.submitterId,
        userAlias: context.submitterAlias,
        objectives,
      });
    }

    return { success: true, allObjectivesDone: allDone };
  } catch (err) {
    await logerror('reviewObjectiveAction error', [err]);
    return { success: false, error: 'გაურკვეველი შეცდომა' };
  }
}
