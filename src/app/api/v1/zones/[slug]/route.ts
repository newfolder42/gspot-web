import { NextRequest, NextResponse } from 'next/server';
import { resolveZoneContext, canManage, canModerate } from '@/app/api/v1/_utils/zone';
import { getZoneQuestsEnabled } from '@/lib/zones';
import { logerror } from '@/lib/logger';

type Context = { params: Promise<{ slug: string }> };

export async function GET(req: NextRequest, context: Context) {
  try {
    const { slug } = await context.params;
    const { ctx, response } = await resolveZoneContext(req, slug);
    if (response) return response;

    const { zone, member } = ctx;
    const questsEnabled = await getZoneQuestsEnabled(zone.id);

    return NextResponse.json({
      zone: {
        id: zone.id,
        slug: zone.slug,
        name: zone.name,
        description: zone.description,
        profilePhotoUrl: zone.profile_photo_url ?? null,
        bannerUrl: zone.banner_url ?? null,
        visibility: zone.visibility,
        joinPolicy: zone.join_policy,
      },
      membership: member ? { status: member.status, role: member.role } : null,
      questsEnabled,
      canManage: canManage(member?.role),
      canModerate: canModerate(member?.role),
    });
  } catch (err) {
    await logerror('GET /api/v1/zones/[slug] error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
