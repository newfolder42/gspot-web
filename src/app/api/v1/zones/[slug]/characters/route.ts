import { NextRequest, NextResponse } from 'next/server';
import { resolveZoneContext } from '@/app/api/v1/_utils/zone';
import { getZoneQuestCharacters } from '@/lib/quests';
import { logerror } from '@/lib/logger';

type Context = { params: Promise<{ slug: string }> };

export async function GET(req: NextRequest, context: Context) {
  try {
    const { slug } = await context.params;
    const { ctx, response } = await resolveZoneContext(req, slug);
    if (response) return response;

    const characters = await getZoneQuestCharacters(ctx.zone.id);
    return NextResponse.json({ characters });
  } catch (err) {
    await logerror('GET /api/v1/zones/[slug]/characters error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
