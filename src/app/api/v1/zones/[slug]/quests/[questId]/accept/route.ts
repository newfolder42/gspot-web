import { NextRequest, NextResponse } from 'next/server';
import { resolveZoneContext } from '@/app/api/v1/_utils/zone';
import { getQuestById, getUserQuest, acceptQuest } from '@/lib/quests';
import { getQuestLockReason } from '@/lib/questProgress';
import { getUserLevel } from '@/lib/users';
import { eventBus } from '@/lib/eventBus';
import { logerror } from '@/lib/logger';

type Context = { params: Promise<{ slug: string; questId: string }> };

export async function POST(req: NextRequest, context: Context) {
  try {
    const { slug, questId: questIdParam } = await context.params;
    const questId = Number(questIdParam);
    if (!Number.isInteger(questId)) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }

    const { ctx, response } = await resolveZoneContext(req, slug);
    if (response) return response;

    const quest = await getQuestById(questId);
    if (!quest || quest.zone_id !== ctx.zone.id || quest.status !== 'active') {
      return NextResponse.json({ error: 'QUEST_NOT_FOUND' }, { status: 404 });
    }

    if (!ctx.member || ctx.member.status !== 'active') {
      return NextResponse.json({ error: 'NOT_MEMBER' }, { status: 403 });
    }
    if (ctx.member.role !== 'member') {
      return NextResponse.json({ error: 'STAFF_CANNOT_ACCEPT' }, { status: 403 });
    }

    const existing = await getUserQuest(questId, ctx.user.userId);
    if (existing) {
      return NextResponse.json({ error: 'ALREADY_ACCEPTED' }, { status: 409 });
    }

    const callerLevel = await getUserLevel(ctx.user.userId);
    const lockReason = getQuestLockReason({
      startDate: quest.start_date,
      endDate: quest.end_date,
      requiredLevel: quest.required_level,
      callerLevel,
    });
    if (lockReason) {
      return NextResponse.json({ error: 'LOCKED', message: lockReason }, { status: 400 });
    }

    const ok = await acceptQuest(questId, ctx.user.userId);
    if (!ok) {
      return NextResponse.json({ error: 'ACCEPT_FAILED' }, { status: 500 });
    }

    await eventBus.publish('zone_quest', 'accepted', {
      questId,
      zoneId: quest.zone_id,
      userId: ctx.user.userId,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    await logerror('POST /api/v1/zones/[slug]/quests/[questId]/accept error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
