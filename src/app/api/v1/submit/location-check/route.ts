import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { checkSameLocationPostLimit } from '@/lib/postLocations';
import { logerror } from '@/lib/logger';

const BodySchema = z.object({
  coordinates: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
});

/**
 * Mirrors `checkPostLocationAllowed` in actions/submit.ts — the app asks before uploading
 * so the user is not made to wait through a photo upload only to be turned down. The
 * binding check still runs inside `createMobilePost`.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }

    const limit = await checkSameLocationPostLimit({
      userId: auth.user.userId,
      coordinates: parsed.data.coordinates,
    });

    return NextResponse.json(
      limit.allowed ? { allowed: true } : { allowed: false, message: limit.message }
    );
  } catch (err) {
    await logerror('POST /api/v1/submit/location-check error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
