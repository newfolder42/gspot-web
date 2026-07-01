import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveZoneContext, canModerate } from '@/app/api/v1/_utils/zone';
import { inviteZoneMember } from '@/lib/zones';
import { getUserIdByAlias } from '@/lib/users';
import { eventBus } from '@/lib/eventBus';
import { logerror } from '@/lib/logger';

type Context = { params: Promise<{ slug: string }> };

const BodySchema = z.object({
  alias: z.string().trim().min(1).max(60),
});

export async function POST(req: NextRequest, context: Context) {
  try {
    const { slug } = await context.params;
    const { ctx, response } = await resolveZoneContext(req, slug);
    if (response) return response;
    if (!canModerate(ctx.member?.role)) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }

    const targetAlias = parsed.data.alias.toLowerCase();
    const target = await getUserIdByAlias(targetAlias);
    if (!target) {
      return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 });
    }
    const targetUserId = Number(target);

    const result = await inviteZoneMember(ctx.zone.id, targetUserId);
    if (!result.success) {
      return NextResponse.json(
        { error: result.alreadyMember ? 'ALREADY_MEMBER' : 'INVITE_FAILED' },
        { status: 400 }
      );
    }

    await eventBus.publish('zone_member', 'added', {
      zoneId: ctx.zone.id,
      zoneSlug: ctx.zone.slug,
      userId: targetUserId,
      userAlias: targetAlias,
      invitedBy: ctx.user.userId,
      invitedByAlias: ctx.user.alias,
      status: 'pending',
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    await logerror('POST /api/v1/zones/[slug]/members/invite error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
