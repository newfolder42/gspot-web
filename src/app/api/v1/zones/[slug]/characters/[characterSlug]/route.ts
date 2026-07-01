import { NextRequest, NextResponse } from 'next/server';
import { resolveZoneContext } from '@/app/api/v1/_utils/zone';
import { getZoneQuestCharacterBySlug } from '@/lib/quests';
import { logerror } from '@/lib/logger';

type Context = { params: Promise<{ slug: string; characterSlug: string }> };

export async function GET(req: NextRequest, context: Context) {
  try {
    const { slug, characterSlug } = await context.params;
    const { ctx, response } = await resolveZoneContext(req, slug);
    if (response) return response;

    const character = await getZoneQuestCharacterBySlug(ctx.zone.id, characterSlug);
    if (!character) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json({ character });
  } catch (err) {
    await logerror('GET /api/v1/zones/[slug]/characters/[characterSlug] error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
