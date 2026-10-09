import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { correctPostLocation } from '@/lib/postLocationDisputes';
import { LOCATION_ERROR_STATUS } from '@/app/api/v1/_utils/location';
import { logerror } from '@/lib/logger';

const ParamsSchema = z.object({ id: z.coerce.number().int().positive() });
const BodySchema = z.object({
  coordinates: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
});

type Context = { params: Promise<{ id: string }> };

// POST /api/v1/posts/:id/location-correction — the author of a suspended post gives it its
// real location. The post goes live again and every guess is re-scored against the new spot.
export async function POST(req: NextRequest, context: Context) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const parsedParams = ParamsSchema.safeParse(await context.params);
    const parsedBody = BodySchema.safeParse(await req.json().catch(() => null));
    if (!parsedParams.success || !parsedBody.success) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }

    const result = await correctPostLocation(
      auth.user.userId,
      auth.user.alias,
      parsedParams.data.id,
      parsedBody.data.coordinates
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: LOCATION_ERROR_STATUS[result.error] });
    }

    return NextResponse.json({ ok: true, rescored: result.rescored });
  } catch (err) {
    await logerror('POST /api/v1/posts/[id]/location-correction error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
