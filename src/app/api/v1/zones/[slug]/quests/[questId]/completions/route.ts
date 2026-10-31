import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveZoneContext } from '@/app/api/v1/_utils/zone';
import { getQuestById, getQuestCompletionSummary } from '@/lib/quests';
import { getZonePosts } from '@/lib/posts';
import { logerror } from '@/lib/logger';

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(18),
  cursorDate: z.string().trim().min(1).optional(),
  cursorId: z.coerce.number().int().positive().optional(),
});

type Context = { params: Promise<{ slug: string; questId: string }> };

// A quest's completion posts, newest first. Only for members who have completed the quest
// themselves and zone staff (see getQuestCompletionSummary); anyone else gets 403.
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

    const { canView } = await getQuestCompletionSummary(questId, ctx.zone.id, ctx.user.userId);
    if (!canView) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

    const parsed = QuerySchema.safeParse({
      limit: req.nextUrl.searchParams.get('limit') ?? undefined,
      cursorDate: req.nextUrl.searchParams.get('cursorDate') ?? undefined,
      cursorId: req.nextUrl.searchParams.get('cursorId') ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }

    const cursor =
      parsed.data.cursorDate && parsed.data.cursorId
        ? { date: parsed.data.cursorDate, id: parsed.data.cursorId }
        : undefined;

    const posts = await getZonePosts(ctx.zone.id, ctx.user.userId, parsed.data.limit, cursor, 'all', null, questId);

    return NextResponse.json({ posts });
  } catch (err) {
    await logerror('GET /api/v1/zones/[slug]/quests/[questId]/completions error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
