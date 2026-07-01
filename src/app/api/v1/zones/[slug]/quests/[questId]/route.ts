import { NextRequest, NextResponse } from 'next/server';
import { resolveZoneContext, canModerate } from '@/app/api/v1/_utils/zone';
import {
  getQuestById,
  getQuestObjectivesWithProgress,
  getUserQuest,
  getQuestCharacter,
  getCompletedQuestPhotos,
} from '@/lib/quests';
import { getQuestLockReason } from '@/lib/questProgress';
import { getUserLevel } from '@/lib/users';
import { logerror } from '@/lib/logger';

type Context = { params: Promise<{ slug: string; questId: string }> };

export async function GET(req: NextRequest, context: Context) {
  try {
    const { slug, questId: questIdParam } = await context.params;
    const questId = Number(questIdParam);
    if (!Number.isInteger(questId)) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }

    const { ctx, response } = await resolveZoneContext(req, slug);
    if (response) return response;

    const quest = await getQuestById(questId);
    if (!quest || quest.zone_id !== ctx.zone.id) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    const userQuest = await getUserQuest(questId, ctx.user.userId);
    const [objectives, character, callerLevel] = await Promise.all([
      getQuestObjectivesWithProgress(questId, userQuest?.id ?? null),
      quest.character_id ? getQuestCharacter(quest.character_id) : Promise.resolve(null),
      getUserLevel(ctx.user.userId),
    ]);

    const lockReason =
      quest.status !== 'active'
        ? 'მისია არქივშია'
        : getQuestLockReason({
            startDate: quest.start_date,
            endDate: quest.end_date,
            requiredLevel: quest.required_level,
            callerLevel,
          });

    const canAccept = Boolean(
      !userQuest && ctx.member?.role === 'member' && ctx.member.status === 'active' && !lockReason
    );

    const gallery =
      userQuest?.status === 'completed'
        ? await getCompletedQuestPhotos(questId, ctx.user.userId)
        : [];

    return NextResponse.json({
      quest,
      character,
      objectives,
      userQuest,
      lockReason,
      canAccept,
      canModerate: canModerate(ctx.member?.role),
      gallery,
    });
  } catch (err) {
    await logerror('GET /api/v1/zones/[slug]/quests/[questId] error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
