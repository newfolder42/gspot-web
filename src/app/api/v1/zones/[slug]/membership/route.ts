import { NextRequest, NextResponse } from 'next/server';
import { resolveZoneContext } from '@/app/api/v1/_utils/zone';
import { requestZoneMembership, leaveZone, getZoneMember } from '@/lib/zones';
import { logerror } from '@/lib/logger';

type Context = { params: Promise<{ slug: string }> };

// Join / request to join
export async function POST(req: NextRequest, context: Context) {
  try {
    const { slug } = await context.params;
    const { ctx, response } = await resolveZoneContext(req, slug);
    if (response) return response;

    const result = await requestZoneMembership(ctx.zone.id, ctx.user.userId);
    if (!result.success) {
      return NextResponse.json({ error: result.error ?? 'REQUEST_FAILED' }, { status: 400 });
    }

    const member = await getZoneMember(ctx.zone.id, ctx.user.userId);
    return NextResponse.json({ status: member?.status ?? null, role: member?.role ?? null });
  } catch (err) {
    await logerror('POST /api/v1/zones/[slug]/membership error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}

// Leave
export async function DELETE(req: NextRequest, context: Context) {
  try {
    const { slug } = await context.params;
    const { ctx, response } = await resolveZoneContext(req, slug);
    if (response) return response;

    const result = await leaveZone(ctx.zone.id, ctx.user.userId);
    if (!result.success) {
      return NextResponse.json({ error: result.error ?? 'LEAVE_FAILED' }, { status: 400 });
    }

    return NextResponse.json({ status: null });
  } catch (err) {
    await logerror('DELETE /api/v1/zones/[slug]/membership error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
