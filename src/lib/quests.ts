"use server";

import { query } from '@/lib/db';
import { logerror } from './logger';
import { getQuestLockReason } from './questProgress';
import { slugify } from './slug';
import type { ImageVariants } from './image-pipeline';
import type {
  ZoneQuestBaseType,
  ZoneQuestObjectiveBaseType,
  ZoneQuestWithStatsType,
  ZoneQuestObjectiveWithProgressType,
  UserQuestBaseType,
  UserQuestObjectiveBaseType,
  PendingObjectiveReviewType,
  CompletedQuestPhotoType,
  ZoneQuestCharacterType,
  UserQuestLogEntryType,
  ObjectiveTypeId,
  ObjectiveConfig,
  CaptureData,
  QuestModerationSummaryType,
} from '@/types/quest';

export async function getZoneQuests(zoneId: number, userId: number | null): Promise<ZoneQuestWithStatsType[]> {
  try {
    const res = await query(
      `select zq.id, zq.zone_id, zq.title, zq.description, zq.objective_order, zq.status,
              zq.character_id, zq.required_level, zq.start_date, zq.end_date,
              zq.created_by, zq.created_at, zq.updated_at,
              (select count(*) from zone_quest_objectives zqo where zqo.quest_id = zq.id) as objective_count,
              (select count(*) from user_quests uq2 where uq2.quest_id = zq.id and uq2.status = 'active') as active_count,
              (select count(*) from user_quests uq2 where uq2.quest_id = zq.id and uq2.status = 'completed') as completed_count,
              uq.status as my_status,
              zc.name as character_name, zc.avatar_url as character_avatar_url,
              coalesce(ux.level, 0) as caller_level
       from zone_quests zq
       left join user_quests uq on uq.quest_id = zq.id and uq.user_id = $2
       left join zone_quest_characters zc on zc.id = zq.character_id
       left join user_xp ux on ux.user_id = $2
       where zq.zone_id = $1 and zq.status = 'active'`,
      [zoneId, userId]
    );
    const quests = res.rows.map((r: any) => {
      const requiredLevel = r.required_level !== null ? Number(r.required_level) : null;
      const lockReason = getQuestLockReason({
        startDate: r.start_date,
        endDate: r.end_date,
        requiredLevel,
        callerLevel: Number(r.caller_level),
      });
      return {
        id: Number(r.id),
        zone_id: Number(r.zone_id),
        title: r.title,
        description: r.description,
        objective_order: r.objective_order,
        status: r.status,
        character_id: r.character_id !== null ? Number(r.character_id) : null,
        required_level: requiredLevel,
        start_date: r.start_date,
        end_date: r.end_date,
        created_by: r.created_by !== null ? Number(r.created_by) : null,
        created_at: r.created_at,
        updated_at: r.updated_at,
        objectiveCount: Number(r.objective_count),
        activeCount: Number(r.active_count),
        completedCount: Number(r.completed_count),
        myStatus: r.my_status ?? null,
        characterName: r.character_name ?? null,
        characterAvatarUrl: r.character_avatar_url ?? null,
        lockReason,
      };
    });
    return quests.sort(questListComparator);
  } catch (err) {
    await logerror('getZoneQuests error', [err]);
    return [];
  }
}

// Status priority for the zone quest list: my in-progress quests first, then
// what's available to start, then locked, then quests I've already finished.
function questStatusPriority(quest: ZoneQuestWithStatsType): number {
  if (quest.myStatus === 'active') return 0;
  if (quest.myStatus === null && !quest.lockReason) return 1;
  if (quest.myStatus === null && quest.lockReason) return 2;
  return 3; // completed
}

function questListComparator(a: ZoneQuestWithStatsType, b: ZoneQuestWithStatsType): number {
  const priorityDiff = questStatusPriority(a) - questStatusPriority(b);
  if (priorityDiff !== 0) return priorityDiff;
  // Cluster quests from the same character together within a priority group.
  if (a.character_id !== b.character_id) return (a.character_id ?? Infinity) - (b.character_id ?? Infinity);
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

export async function getQuestById(questId: number): Promise<ZoneQuestBaseType | null> {
  try {
    const res = await query(`select * from zone_quests where id = $1 limit 1`, [questId]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: Number(r.id),
      zone_id: Number(r.zone_id),
      title: r.title,
      description: r.description,
      objective_order: r.objective_order,
      status: r.status,
      character_id: r.character_id !== null ? Number(r.character_id) : null,
      required_level: r.required_level !== null ? Number(r.required_level) : null,
      start_date: r.start_date,
      end_date: r.end_date,
      created_by: r.created_by !== null ? Number(r.created_by) : null,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  } catch (err) {
    await logerror('getQuestById error', [err]);
    return null;
  }
}

export async function getQuestObjectives(questId: number): Promise<ZoneQuestObjectiveBaseType[]> {
  try {
    const res = await query(
      `select * from zone_quest_objectives where quest_id = $1 order by sort_order asc`,
      [questId]
    );
    return res.rows.map((r: any) => ({
      id: Number(r.id),
      quest_id: Number(r.quest_id),
      title: r.title,
      display_text: r.display_text,
      type: r.type as ObjectiveTypeId,
      config: (r.config ?? {}) as ObjectiveConfig,
      sort_order: Number(r.sort_order),
      created_at: r.created_at,
    }));
  } catch (err) {
    await logerror('getQuestObjectives error', [err]);
    return [];
  }
}

export async function getObjectiveById(objectiveId: number): Promise<ZoneQuestObjectiveBaseType | null> {
  try {
    const res = await query(`select * from zone_quest_objectives where id = $1 limit 1`, [objectiveId]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: Number(r.id),
      quest_id: Number(r.quest_id),
      title: r.title,
      display_text: r.display_text,
      type: r.type as ObjectiveTypeId,
      config: (r.config ?? {}) as ObjectiveConfig,
      sort_order: Number(r.sort_order),
      created_at: r.created_at,
    };
  } catch (err) {
    await logerror('getObjectiveById error', [err]);
    return null;
  }
}

export async function getQuestObjectivesWithProgress(
  questId: number,
  userQuestId: number | null
): Promise<ZoneQuestObjectiveWithProgressType[]> {
  try {
    const res = await query(
      `select zqo.id, zqo.quest_id, zqo.title, zqo.display_text, zqo.type, zqo.config,
              zqo.sort_order, zqo.created_at,
              uqo.status as progress_status, uqo.rejection_reason, uqo.photo_url
       from zone_quest_objectives zqo
       left join user_quest_objectives uqo on uqo.objective_id = zqo.id and uqo.user_quest_id = $2
       where zqo.quest_id = $1
       order by zqo.sort_order asc`,
      [questId, userQuestId]
    );
    return res.rows.map((r: any) => ({
      id: Number(r.id),
      quest_id: Number(r.quest_id),
      title: r.title,
      display_text: r.display_text,
      type: r.type as ObjectiveTypeId,
      config: (r.config ?? {}) as ObjectiveConfig,
      sort_order: Number(r.sort_order),
      created_at: r.created_at,
      progressStatus: r.progress_status ?? null,
      rejectionReason: r.rejection_reason ?? null,
      photoUrl: r.photo_url ?? null,
    }));
  } catch (err) {
    await logerror('getQuestObjectivesWithProgress error', [err]);
    return [];
  }
}

export type CreateQuestInput = {
  zoneId: number;
  title: string;
  description: string | null;
  objectiveOrder: string;
  createdBy: number;
  characterId?: number | null;
  requiredLevel?: number | null;
  startDate?: string | null;
  endDate?: string | null;
};

export async function createQuest(input: CreateQuestInput): Promise<ZoneQuestBaseType | null> {
  try {
    const res = await query(
      `INSERT INTO zone_quests
         (zone_id, title, description, objective_order, status, character_id, required_level, start_date, end_date, created_by)
       VALUES ($1, $2, $3, $4, 'active', $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        input.zoneId,
        input.title,
        input.description,
        input.objectiveOrder,
        input.characterId ?? null,
        input.requiredLevel ?? null,
        input.startDate ?? null,
        input.endDate ?? null,
        input.createdBy,
      ]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: Number(r.id),
      zone_id: Number(r.zone_id),
      title: r.title,
      description: r.description,
      objective_order: r.objective_order,
      status: r.status,
      character_id: r.character_id !== null ? Number(r.character_id) : null,
      required_level: r.required_level !== null ? Number(r.required_level) : null,
      start_date: r.start_date,
      end_date: r.end_date,
      created_by: r.created_by !== null ? Number(r.created_by) : null,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  } catch (err) {
    await logerror('createQuest error', [err]);
    return null;
  }
}

export type CreateQuestObjectiveInput = {
  title?: string | null;
  displayText: string;
  type: ObjectiveTypeId;
  config: ObjectiveConfig;
};

export async function createQuestObjectives(questId: number, objectives: CreateQuestObjectiveInput[]): Promise<boolean> {
  try {
    await Promise.all(
      objectives.map((obj, index) =>
        query(
          `INSERT INTO zone_quest_objectives (quest_id, title, display_text, type, config, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [questId, obj.title ?? null, obj.displayText, obj.type, JSON.stringify(obj.config ?? {}), index]
        )
      )
    );
    return true;
  } catch (err) {
    await logerror('createQuestObjectives error', [err]);
    return false;
  }
}

export async function getUserQuest(questId: number, userId: number): Promise<UserQuestBaseType | null> {
  try {
    const res = await query(
      `select * from user_quests where quest_id = $1 and user_id = $2 limit 1`,
      [questId, userId]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: Number(r.id),
      quest_id: Number(r.quest_id),
      user_id: Number(r.user_id),
      status: r.status,
      accepted_at: r.accepted_at,
      completed_at: r.completed_at,
      reviewed_by: r.reviewed_by !== null ? Number(r.reviewed_by) : null,
      reviewed_at: r.reviewed_at,
      created_at: r.created_at,
    };
  } catch (err) {
    await logerror('getUserQuest error', [err]);
    return null;
  }
}

export async function getUserQuestById(userQuestId: number): Promise<UserQuestBaseType | null> {
  try {
    const res = await query(`select * from user_quests where id = $1 limit 1`, [userQuestId]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: Number(r.id),
      quest_id: Number(r.quest_id),
      user_id: Number(r.user_id),
      status: r.status,
      accepted_at: r.accepted_at,
      completed_at: r.completed_at,
      reviewed_by: r.reviewed_by !== null ? Number(r.reviewed_by) : null,
      reviewed_at: r.reviewed_at,
      created_at: r.created_at,
    };
  } catch (err) {
    await logerror('getUserQuestById error', [err]);
    return null;
  }
}

export async function acceptQuest(questId: number, userId: number): Promise<boolean> {
  try {
    const res = await query(
      `INSERT INTO user_quests (quest_id, user_id, status)
       VALUES ($1, $2, 'active')
       ON CONFLICT (quest_id, user_id) DO NOTHING
       RETURNING id`,
      [questId, userId]
    );
    return res.rows.length > 0;
  } catch (err) {
    await logerror('acceptQuest error', [err]);
    return false;
  }
}

export type SubmitObjectiveCaptureInput = {
  photoUrl: string;
  captureData: CaptureData;
};

export async function submitObjectiveCapture(
  userQuestId: number,
  objectiveId: number,
  input: SubmitObjectiveCaptureInput
): Promise<boolean> {
  try {
    const res = await query(
      `INSERT INTO user_quest_objectives
         (user_quest_id, objective_id, status, photo_url, capture_data, submitted_at)
       VALUES ($1, $2, 'pending_review', $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (user_quest_id, objective_id) DO UPDATE SET
         status = 'pending_review',
         photo_url = EXCLUDED.photo_url,
         capture_data = EXCLUDED.capture_data,
         submitted_at = CURRENT_TIMESTAMP,
         reviewed_by = NULL,
         reviewed_at = NULL,
         rejection_reason = NULL
       WHERE user_quest_objectives.status IN ('pending', 'rejected')
       RETURNING id`,
      [userQuestId, objectiveId, input.photoUrl, JSON.stringify(input.captureData ?? {})]
    );
    return res.rows.length > 0;
  } catch (err) {
    await logerror('submitObjectiveCapture error', [err]);
    return false;
  }
}

export type ObjectiveReviewContext = {
  id: number;
  userQuestId: number;
  objectiveId: number;
  questId: number;
  zoneId: number;
  submitterId: number;
  submitterAlias: string;
  status: string;
};

export async function getObjectiveReviewContext(userQuestObjectiveId: number): Promise<ObjectiveReviewContext | null> {
  try {
    const res = await query(
      `select uqo.id, uqo.user_quest_id, uqo.objective_id, uqo.status,
              uq.quest_id, uq.user_id as submitter_id, u.alias as submitter_alias, zq.zone_id
       from user_quest_objectives uqo
       join user_quests uq on uq.id = uqo.user_quest_id
       join zone_quests zq on zq.id = uq.quest_id
       join users u on u.id = uq.user_id
       where uqo.id = $1
       limit 1`,
      [userQuestObjectiveId]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: Number(r.id),
      userQuestId: Number(r.user_quest_id),
      objectiveId: Number(r.objective_id),
      questId: Number(r.quest_id),
      zoneId: Number(r.zone_id),
      submitterId: Number(r.submitter_id),
      submitterAlias: r.submitter_alias,
      status: r.status,
    };
  } catch (err) {
    await logerror('getObjectiveReviewContext error', [err]);
    return null;
  }
}

export async function reviewObjective(
  userQuestObjectiveId: number,
  reviewerId: number,
  decision: 'approve' | 'reject',
  rejectionReason?: string | null
): Promise<boolean> {
  try {
    const newStatus = decision === 'approve' ? 'completed' : 'rejected';
    const res = await query(
      `UPDATE user_quest_objectives
       SET status = $2, reviewed_by = $3, reviewed_at = CURRENT_TIMESTAMP, rejection_reason = $4
       WHERE id = $1 AND status = 'pending_review'
       RETURNING id`,
      [userQuestObjectiveId, newStatus, reviewerId, decision === 'reject' ? (rejectionReason ?? null) : null]
    );
    return res.rows.length > 0;
  } catch (err) {
    await logerror('reviewObjective error', [err]);
    return false;
  }
}

export async function allObjectivesCompleted(userQuestId: number): Promise<boolean> {
  try {
    const res = await query(
      `select
         (select count(*) from zone_quest_objectives where quest_id = (select quest_id from user_quests where id = $1)) as total,
         (select count(*) from user_quest_objectives where user_quest_id = $1 and status = 'completed') as completed`,
      [userQuestId]
    );
    if (res.rows.length === 0) return false;
    const total = Number(res.rows[0].total);
    const completed = Number(res.rows[0].completed);
    return total > 0 && total === completed;
  } catch (err) {
    await logerror('allObjectivesCompleted error', [err]);
    return false;
  }
}

export async function completeQuest(userQuestId: number): Promise<boolean> {
  try {
    const res = await query(
      `UPDATE user_quests SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = $1 AND status = 'active' RETURNING id`,
      [userQuestId]
    );
    return res.rows.length > 0;
  } catch (err) {
    await logerror('completeQuest error', [err]);
    return false;
  }
}

export async function getUserQuestCompletionSummary(userQuestId: number): Promise<{ objectiveTitle: string | null; photoUrl: string | null; photoVariants: ImageVariants | null }[]> {
  try {
    const res = await query(
      `select zqo.title as objective_title, uqo.photo_url, uqo.capture_data
       from user_quest_objectives uqo
       join zone_quest_objectives zqo on zqo.id = uqo.objective_id
       where uqo.user_quest_id = $1 and uqo.status = 'completed'
       order by zqo.sort_order asc`,
      [userQuestId]
    );
    return res.rows.map((r: any) => ({
      objectiveTitle: r.objective_title,
      photoUrl: r.photo_url,
      photoVariants: r.capture_data?.variants ?? null,
    }));
  } catch (err) {
    await logerror('getUserQuestCompletionSummary error', [err]);
    return [];
  }
}

export async function getPendingObjectiveReviews(questId: number): Promise<PendingObjectiveReviewType[]> {
  try {
    const res = await query(
      `select uqo.id, uq.quest_id, zqo.id as objective_id, zqo.title as objective_title,
              zqo.display_text, zqo.type, zqo.config, uqo.photo_url, uqo.capture_data,
              uqo.submitted_at, uq.user_id, u.alias as user_alias
       from user_quest_objectives uqo
       join user_quests uq on uq.id = uqo.user_quest_id
       join zone_quest_objectives zqo on zqo.id = uqo.objective_id
       join users u on u.id = uq.user_id
       where uq.quest_id = $1 and uqo.status = 'pending_review'
       order by uqo.submitted_at asc`,
      [questId]
    );
    return res.rows.map((r: any) => {
      const config = r.config ?? {};
      const captureData = r.capture_data ?? {};
      const isLocationType = r.type === 'in_range_location';
      return {
        id: Number(r.id),
        questId: Number(r.quest_id),
        objectiveId: Number(r.objective_id),
        objectiveTitle: r.objective_title,
        displayText: r.display_text,
        objectiveType: r.type as ObjectiveTypeId,
        photoUrl: r.photo_url,
        photoVariants: captureData.variants ?? null,
        captureMethod: isLocationType ? (captureData.captureMethod ?? null) : null,
        distanceMeters: isLocationType && captureData.distanceMeters != null ? Number(captureData.distanceMeters) : null,
        radiusMeters: isLocationType && config.radiusMeters != null ? Number(config.radiusMeters) : null,
        submittedAt: r.submitted_at,
        userId: Number(r.user_id),
        userAlias: r.user_alias,
      };
    });
  } catch (err) {
    await logerror('getPendingObjectiveReviews error', [err]);
    return [];
  }
}

export async function getZoneQuestsPendingModeration(zoneId: number): Promise<QuestModerationSummaryType[]> {
  try {
    const res = await query(
      `select zq.id as quest_id, zq.title as quest_title,
              zc.name as character_name, zc.avatar_url as character_avatar_url,
              count(uqo.id) as pending_count
       from zone_quests zq
       join user_quests uq on uq.quest_id = zq.id
       join user_quest_objectives uqo on uqo.user_quest_id = uq.id and uqo.status = 'pending_review'
       left join zone_quest_characters zc on zc.id = zq.character_id
       where zq.zone_id = $1
       group by zq.id, zq.title, zc.name, zc.avatar_url
       order by max(uqo.submitted_at) asc`,
      [zoneId]
    );
    return res.rows.map((r: any) => ({
      questId: Number(r.quest_id),
      questTitle: r.quest_title,
      characterName: r.character_name ?? null,
      characterAvatarUrl: r.character_avatar_url ?? null,
      pendingCount: Number(r.pending_count),
    }));
  } catch (err) {
    await logerror('getZoneQuestsPendingModeration error', [err]);
    return [];
  }
}

export async function getCompletedQuestPhotos(questId: number, excludingUserId: number): Promise<CompletedQuestPhotoType[]> {
  try {
    const res = await query(
      `select zqo.id as objective_id, zqo.title as objective_title, uqo.photo_url, uqo.capture_data,
              uq.user_id, u.alias as user_alias, uqo.reviewed_at
       from user_quest_objectives uqo
       join user_quests uq on uq.id = uqo.user_quest_id
       join zone_quest_objectives zqo on zqo.id = uqo.objective_id
       join users u on u.id = uq.user_id
       where uq.quest_id = $1 and uq.status = 'completed' and uq.user_id != $2 and uqo.photo_url is not null
       order by zqo.sort_order asc, uqo.reviewed_at asc`,
      [questId, excludingUserId]
    );
    return res.rows.map((r: any) => ({
      objectiveId: Number(r.objective_id),
      objectiveTitle: r.objective_title,
      photoUrl: r.photo_url,
      photoVariants: r.capture_data?.variants ?? null,
      userId: Number(r.user_id),
      userAlias: r.user_alias,
      reviewedAt: r.reviewed_at,
    }));
  } catch (err) {
    await logerror('getCompletedQuestPhotos error', [err]);
    return [];
  }
}

export async function getQuestPhotosByAuthorAlias(questId: number, userAlias: string): Promise<CompletedQuestPhotoType[]> {
  try {
    const res = await query(
      `select zqo.id as objective_id, zqo.title as objective_title, uqo.photo_url, uqo.capture_data,
              uq.user_id, u.alias as user_alias, uqo.reviewed_at
       from user_quest_objectives uqo
       join user_quests uq on uq.id = uqo.user_quest_id
       join zone_quest_objectives zqo on zqo.id = uqo.objective_id
       join users u on u.id = uq.user_id
       where uq.quest_id = $1 and uq.status = 'completed' and u.alias = $2 and uqo.photo_url is not null
       order by zqo.sort_order asc, uqo.reviewed_at asc`,
      [questId, userAlias]
    );
    return res.rows.map((r: any) => ({
      objectiveId: Number(r.objective_id),
      objectiveTitle: r.objective_title,
      photoUrl: r.photo_url,
      photoVariants: r.capture_data?.variants ?? null,
      userId: Number(r.user_id),
      userAlias: r.user_alias,
      reviewedAt: r.reviewed_at,
    }));
  } catch (err) {
    await logerror('getQuestPhotosByAuthorAlias error', [err]);
    return [];
  }
}

export async function getZoneQuestCharacters(zoneId: number): Promise<ZoneQuestCharacterType[]> {
  try {
    const res = await query(
      `select * from zone_quest_characters where zone_id = $1 order by created_at asc`,
      [zoneId]
    );
    return res.rows.map((r: any) => ({
      id: Number(r.id),
      zone_id: Number(r.zone_id),
      name: r.name,
      slug: r.slug,
      avatar_url: r.avatar_url,
      description: r.description,
      created_by: r.created_by !== null ? Number(r.created_by) : null,
      created_at: r.created_at,
    }));
  } catch (err) {
    await logerror('getZoneQuestCharacters error', [err]);
    return [];
  }
}

export async function getQuestCharacter(characterId: number): Promise<ZoneQuestCharacterType | null> {
  try {
    const res = await query(`select * from zone_quest_characters where id = $1 limit 1`, [characterId]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: Number(r.id),
      zone_id: Number(r.zone_id),
      name: r.name,
      slug: r.slug,
      avatar_url: r.avatar_url,
      description: r.description,
      created_by: r.created_by !== null ? Number(r.created_by) : null,
      created_at: r.created_at,
    };
  } catch (err) {
    await logerror('getQuestCharacter error', [err]);
    return null;
  }
}

export async function getZoneQuestCharacterBySlug(zoneId: number, slug: string): Promise<ZoneQuestCharacterType | null> {
  try {
    const res = await query(
      `select * from zone_quest_characters where zone_id = $1 and slug = $2 limit 1`,
      [zoneId, slug]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: Number(r.id),
      zone_id: Number(r.zone_id),
      name: r.name,
      slug: r.slug,
      avatar_url: r.avatar_url,
      description: r.description,
      created_by: r.created_by !== null ? Number(r.created_by) : null,
      created_at: r.created_at,
    };
  } catch (err) {
    await logerror('getZoneQuestCharacterBySlug error', [err]);
    return null;
  }
}

async function generateUniqueCharacterSlug(zoneId: number, name: string): Promise<string> {
  const base = slugify(name) || 'character';
  let candidate = base;
  let suffix = 2;
  while (true) {
    const res = await query(
      `select 1 from zone_quest_characters where zone_id = $1 and slug = $2 limit 1`,
      [zoneId, candidate]
    );
    if (res.rows.length === 0) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

export async function getUserQuestLog(userId: number): Promise<UserQuestLogEntryType[]> {
  try {
    const res = await query(
      `select uq.id as user_quest_id, uq.quest_id, uq.status, uq.accepted_at, uq.completed_at,
              zq.title as quest_title, zq.description as quest_description,
              z.id as zone_id, z.slug as zone_slug, z.name as zone_name,
              zc.name as character_name, zc.avatar_url as character_avatar_url,
              (select count(*) from zone_quest_objectives where quest_id = zq.id) as objective_count,
              (select count(*) from user_quest_objectives where user_quest_id = uq.id and status = 'completed') as completed_objective_count
       from user_quests uq
       join zone_quests zq on zq.id = uq.quest_id
       join zones z on z.id = zq.zone_id
       left join zone_quest_characters zc on zc.id = zq.character_id
       where uq.user_id = $1
       order by
         case uq.status when 'active' then 0 when 'completed' then 1 else 2 end,
         uq.accepted_at desc`,
      [userId]
    );
    return res.rows.map((r: any) => ({
      userQuestId: Number(r.user_quest_id),
      questId: Number(r.quest_id),
      questTitle: r.quest_title,
      questDescription: r.quest_description,
      status: r.status,
      acceptedAt: r.accepted_at,
      completedAt: r.completed_at,
      zoneId: Number(r.zone_id),
      zoneSlug: r.zone_slug,
      zoneName: r.zone_name,
      characterName: r.character_name ?? null,
      characterAvatarUrl: r.character_avatar_url ?? null,
      objectiveCount: Number(r.objective_count),
      completedObjectiveCount: Number(r.completed_objective_count),
    }));
  } catch (err) {
    await logerror('getUserQuestLog error', [err]);
    return [];
  }
}

export type CreateQuestCharacterInput = {
  zoneId: number;
  name: string;
  avatarUrl: string | null;
  description: string | null;
  createdBy: number;
};

export async function createQuestCharacter(input: CreateQuestCharacterInput): Promise<ZoneQuestCharacterType | null> {
  try {
    const slug = await generateUniqueCharacterSlug(input.zoneId, input.name);
    const res = await query(
      `INSERT INTO zone_quest_characters (zone_id, name, slug, avatar_url, description, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [input.zoneId, input.name, slug, input.avatarUrl, input.description, input.createdBy]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: Number(r.id),
      zone_id: Number(r.zone_id),
      name: r.name,
      slug: r.slug,
      avatar_url: r.avatar_url,
      description: r.description,
      created_by: r.created_by !== null ? Number(r.created_by) : null,
      created_at: r.created_at,
    };
  } catch (err) {
    await logerror('createQuestCharacter error', [err]);
    return null;
  }
}
