import { NextRequest, NextResponse } from 'next/server';
import { resolveZoneContext, canModerate } from '@/app/api/v1/_utils/zone';
import { getZoneMembers } from '@/lib/zones';
import { logerror } from '@/lib/logger';

type Context = { params: Promise<{ slug: string }> };

export async function GET(req: NextRequest, context: Context) {
  try {
    const { slug } = await context.params;
    const { ctx, response } = await resolveZoneContext(req, slug);
    if (response) return response;

    const members = await getZoneMembers(ctx.zone.id);

    return NextResponse.json({
      members: members.map((m) => ({
        id: m.id,
        role: m.role,
        status: m.status,
        joinedAt: m.joined_at,
        user: m.user
          ? { id: m.user.id, alias: m.user.alias, profilePhoto: m.user.profilePhoto ?? null }
          : null,
      })),
      canInvite: canModerate(ctx.member?.role),
    });
  } catch (err) {
    await logerror('GET /api/v1/zones/[slug]/members error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
