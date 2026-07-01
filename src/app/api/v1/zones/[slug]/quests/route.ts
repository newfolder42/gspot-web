import { NextRequest, NextResponse } from 'next/server';
import { resolveZoneContext } from '@/app/api/v1/_utils/zone';
import { getZoneQuestsEnabled } from '@/lib/zones';
import { getZoneQuests } from '@/lib/quests';
import { logerror } from '@/lib/logger';

type Context = { params: Promise<{ slug: string }> };

export async function GET(req: NextRequest, context: Context) {
  try {
    const { slug } = await context.params;
    const { ctx, response } = await resolveZoneContext(req, slug);
    if (response) return response;

    if (!(await getZoneQuestsEnabled(ctx.zone.id))) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    const quests = await getZoneQuests(ctx.zone.id, ctx.user.userId);
    return NextResponse.json({ quests });
  } catch (err) {
    await logerror('GET /api/v1/zones/[slug]/quests error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
