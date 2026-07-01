import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveZoneContext, canManage } from '@/app/api/v1/_utils/zone';
import { getZoneTags, createZoneTag } from '@/lib/tags';
import { logerror } from '@/lib/logger';

type Context = { params: Promise<{ slug: string }> };

const BodySchema = z.object({
  name: z.string().trim().min(1).max(60),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export async function POST(req: NextRequest, context: Context) {
  try {
    const { slug } = await context.params;
    const { ctx, response } = await resolveZoneContext(req, slug);
    if (response) return response;
    if (!canManage(ctx.member?.role)) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }

    const existing = await getZoneTags(ctx.zone.id);
    if (existing.length >= 30) {
      return NextResponse.json({ error: 'TAG_LIMIT' }, { status: 400 });
    }

    const tag = await createZoneTag(ctx.zone.id, parsed.data.name, parsed.data.color, existing.length);
    if (!tag) {
      return NextResponse.json({ error: 'TAG_EXISTS' }, { status: 409 });
    }

    return NextResponse.json({ tag });
  } catch (err) {
    await logerror('POST /api/v1/zones/[slug]/tags error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
