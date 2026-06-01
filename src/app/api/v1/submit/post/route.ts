import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { getUserPostZones } from '@/lib/zones';
import { createMobilePost } from '@/lib/mobile-submit';
import { logerror } from '@/lib/logger';

const BodySchema = z.object({
  title: z.string().trim().max(250).optional().nullable(),
  contentId: z.number().int().positive(),
  zoneId: z.number().int().positive(),
  zoneSlug: z.string().trim().min(1).max(120),
  idempotencyKey: z.string().trim().max(128).optional().nullable(),
  tagId: z.number().int().positive().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }

    const allowedZones = await getUserPostZones(auth.user.userId);
    const selectedZone = allowedZones.find((z) => z.id === parsed.data.zoneId && z.slug === parsed.data.zoneSlug);

    if (!selectedZone) {
      return NextResponse.json({ error: 'ZONE_NOT_ALLOWED' }, { status: 403 });
    }

    const postId = await createMobilePost({
      userId: auth.user.userId,
      userAlias: auth.user.alias,
      title: parsed.data.title ?? '',
      contentId: parsed.data.contentId,
      zoneId: parsed.data.zoneId,
      zoneSlug: parsed.data.zoneSlug,
      idempotencyKey: parsed.data.idempotencyKey ?? null,
      tagId: parsed.data.tagId ?? null,
      status: 'published',
    });

    if (!postId) {
      return NextResponse.json({ error: 'CREATE_POST_FAILED' }, { status: 500 });
    }

    return NextResponse.json({ postId });
  } catch (err) {
    await logerror('POST /api/v1/submit/post error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
