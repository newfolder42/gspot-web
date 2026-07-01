import { NextRequest, NextResponse } from 'next/server';
import { resolveZoneContext, canManage } from '@/app/api/v1/_utils/zone';
import { deleteZoneTag, isZoneTagInUse } from '@/lib/tags';
import { logerror } from '@/lib/logger';

type Context = { params: Promise<{ slug: string; tagId: string }> };

export async function DELETE(req: NextRequest, context: Context) {
  try {
    const { slug, tagId: tagIdParam } = await context.params;
    const tagId = Number(tagIdParam);
    if (!Number.isInteger(tagId)) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }

    const { ctx, response } = await resolveZoneContext(req, slug);
    if (response) return response;
    if (!canManage(ctx.member?.role)) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    if (await isZoneTagInUse(tagId)) {
      return NextResponse.json({ error: 'TAG_IN_USE' }, { status: 409 });
    }

    const deleted = await deleteZoneTag(tagId, ctx.zone.id);
    if (!deleted) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    await logerror('DELETE /api/v1/zones/[slug]/tags/[tagId] error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
