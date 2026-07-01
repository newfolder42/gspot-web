import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import {
  getUserQuestById,
  getObjectiveById,
  getQuestById,
  getQuestObjectivesWithProgress,
  submitObjectiveCapture,
} from '@/lib/quests';
import { isObjectiveAttemptable } from '@/lib/questProgress';
import { haversineMeters } from '@/lib/gpsPhotoGuessScore';
import { processUploadedPhoto } from '@/lib/image-pipeline';
import { getZoneById } from '@/lib/zones';
import { eventBus } from '@/lib/eventBus';
import { logerror } from '@/lib/logger';
import type { CaptureData, InRangeLocationConfig } from '@/types/quest';

const BodySchema = z.object({
  userQuestId: z.number().int().positive(),
  objectiveId: z.number().int().positive(),
  photoUrl: z.string().url().max(2048),
  captureMethod: z.enum(['exif', 'live_gps']).optional(),
  capturedLatitude: z.number().min(-90).max(90).optional(),
  capturedLongitude: z.number().min(-180).max(180).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const body = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }
    const { userQuestId, objectiveId, photoUrl, captureMethod, capturedLatitude, capturedLongitude } = parsed.data;

    const userQuest = await getUserQuestById(userQuestId);
    if (!userQuest || userQuest.user_id !== auth.user.userId) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    if (userQuest.status === 'completed') {
      return NextResponse.json({ error: 'ALREADY_COMPLETED' }, { status: 409 });
    }

    const objective = await getObjectiveById(objectiveId);
    if (!objective || objective.quest_id !== userQuest.quest_id) {
      return NextResponse.json({ error: 'OBJECTIVE_NOT_FOUND' }, { status: 404 });
    }

    const quest = await getQuestById(userQuest.quest_id);
    if (!quest) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

    const objectivesWithProgress = await getQuestObjectivesWithProgress(quest.id, userQuestId);
    if (!isObjectiveAttemptable(objectivesWithProgress, quest.objective_order, objectiveId)) {
      return NextResponse.json({ error: 'OBJECTIVE_LOCKED' }, { status: 400 });
    }

    let captureData: CaptureData = {};
    let distanceMeters: number | undefined;

    if (objective.type === 'in_range_location') {
      const config = objective.config as InRangeLocationConfig;
      if (typeof capturedLatitude !== 'number' || typeof capturedLongitude !== 'number') {
        return NextResponse.json({ error: 'NO_LOCATION' }, { status: 400 });
      }
      distanceMeters = haversineMeters(
        { latitude: capturedLatitude, longitude: capturedLongitude },
        { latitude: config.latitude, longitude: config.longitude }
      );
      if (distanceMeters > config.radiusMeters) {
        return NextResponse.json({ error: 'OUT_OF_RANGE', inRange: false, distanceMeters }, { status: 200 });
      }
      captureData = { capturedLatitude, capturedLongitude, distanceMeters, captureMethod };
    }

    let storedPhotoUrl = photoUrl;
    const processed = await processUploadedPhoto(photoUrl);
    if (processed) {
      storedPhotoUrl = processed.displayUrl;
      captureData = { ...captureData, variants: processed.variants };
    }

    const ok = await submitObjectiveCapture(userQuestId, objectiveId, { photoUrl: storedPhotoUrl, captureData });
    if (!ok) {
      return NextResponse.json({ error: 'SUBMIT_FAILED' }, { status: 500 });
    }

    const zone = await getZoneById(quest.zone_id);
    await eventBus.publish('zone_quest_objective', 'submitted', {
      objectiveId,
      objectiveTitle: objective.title,
      questId: quest.id,
      questTitle: quest.title,
      zoneId: quest.zone_id,
      zoneSlug: zone?.slug ?? '',
      userId: auth.user.userId,
    });

    return NextResponse.json({ success: true, inRange: true, distanceMeters });
  } catch (err) {
    await logerror('POST /api/v1/quests/objective-capture error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
