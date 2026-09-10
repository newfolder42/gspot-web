import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { getUserPostZones } from '@/lib/zones';
import { createMobilePost, isCreateMobilePostRefusal } from '@/lib/mobile-submit';
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

    const created = await createMobilePost({
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

    if (!created) {
      return NextResponse.json({ error: 'CREATE_POST_FAILED' }, { status: 500 });
    }

    // A rule turned the post down, nothing broke — 409, and the sentence to show comes
    // from the server because it carries the numbers the rule is currently tuned to.
    if (isCreateMobilePostRefusal(created)) {
      return NextResponse.json(
        { error: 'SAME_LOCATION_LIMIT', message: created.message },
        { status: 409 }
      );
    }

    // `foundItems` is empty for almost every post — the app only shows a sheet when it is not.
    return NextResponse.json({ postId: created.postId, foundItems: created.foundItems });
  } catch (err) {
    await logerror('POST /api/v1/submit/post error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
