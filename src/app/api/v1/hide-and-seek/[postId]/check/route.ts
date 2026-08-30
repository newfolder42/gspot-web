import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { submitHideAndSeekCheckForUser } from '@/lib/hideAndSeek';
import { logerror } from '@/lib/logger';

const ParamsSchema = z.object({ postId: z.coerce.number().int().positive() });

const BodySchema = z.object({
  // device position at capture time, not EXIF — see lib/hideAndSeek.ts
  coordinates: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  imageUrl: z.string().min(1),
});

type Context = { params: Promise<{ postId: string }> };

// POST /api/v1/hide-and-seek/:postId/check — post a distance check.
// Completes the game for this seeker when it lands inside the catch radius.
export async function POST(req: NextRequest, context: Context) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const params = ParamsSchema.safeParse(await context.params);
    if (!params.success) return NextResponse.json({ error: 'INVALID_PARAMS' }, { status: 400 });

    const body = BodySchema.safeParse(await req.json());
    if (!body.success) return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });

    const result = await submitHideAndSeekCheckForUser(auth.user.userId, auth.user.alias, {
      postId: params.data.postId,
      coordinates: body.data.coordinates,
      imageUrl: body.data.imageUrl,
    });

    if (!result.ok) return NextResponse.json({ error: result.reason.toUpperCase() }, { status: 400 });

    return NextResponse.json(result.data, { status: 201 });
  } catch (err) {
    await logerror('POST /api/v1/hide-and-seek/[postId]/check error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
