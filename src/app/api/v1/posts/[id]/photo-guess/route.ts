import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { createPhotoGuessForUser, getPhotoCoordinatesForUser } from '@/lib/posts';
import { calculatePhotoGuessScore, haversineMeters } from '@/lib/gpsPhotoGuessScore';
import { generateFileUrl } from '@/lib/s3';
import { isInGeorgia } from '@/lib/geo';
import { logerror } from '@/lib/logger';

const ParamsSchema = z.object({ id: z.coerce.number().int().positive() });

const BodySchema = z.object({
  coordinates: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  imageUrl: z.string().url().max(2000),
});

type Context = { params: Promise<{ id: string }> };

// GET /api/v1/posts/:id/photo-guess — a signed S3 URL for the guess photo.
// Access-gated on the post so a signed URL can't be farmed for arbitrary posts.
export async function GET(req: NextRequest, context: Context) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const params = await context.params;
    const parsed = ParamsSchema.safeParse({ id: params.id });
    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }

    const photo = await getPhotoCoordinatesForUser(auth.user.userId, parsed.data.id);
    if (!photo) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

    const signedUrl = await generateFileUrl('guess-photo');
    return NextResponse.json({ signedUrl });
  } catch (err) {
    await logerror('GET /api/v1/posts/[id]/photo-guess error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}

// POST /api/v1/posts/:id/photo-guess — an on-site guess: the user photographs
// the place and the photo's own EXIF GPS is the guess.
//
// Unlike the web flow (which scores client-side and posts the result), distance
// and score are computed here from the submitted coordinates, so a crafted
// request cannot claim an arbitrary score.
export async function POST(req: NextRequest, context: Context) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const params = await context.params;
    const parsedParams = ParamsSchema.safeParse({ id: params.id });
    if (!parsedParams.success) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }
    const postId = parsedParams.data.id;

    const parsedBody = BodySchema.safeParse(await req.json().catch(() => null));
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }
    const { coordinates, imageUrl } = parsedBody.data;

    if (!isInGeorgia(coordinates.latitude, coordinates.longitude)) {
      return NextResponse.json({ error: 'OUTSIDE_GEORGIA' }, { status: 400 });
    }

    const photo = await getPhotoCoordinatesForUser(auth.user.userId, postId);
    if (!photo?.coordinates) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    const distance = haversineMeters(photo.coordinates, coordinates);
    const score = calculatePhotoGuessScore(distance);

    const guess = await createPhotoGuessForUser(auth.user.userId, auth.user.alias, {
      postId,
      coordinates,
      distance,
      score,
      imageUrl,
    });

    if (!guess) {
      return NextResponse.json({ error: 'GUESS_FAILED' }, { status: 403 });
    }

    return NextResponse.json({ guess, distance, score });
  } catch (err) {
    await logerror('POST /api/v1/posts/[id]/photo-guess error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
