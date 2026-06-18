import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { query } from '@/lib/db';
import { eventBus } from '@/lib/eventBus';
import { calculateGuessScore, haversineMeters } from '@/lib/gpsPhotoGuessScore';
import { logerror } from '@/lib/logger';
import type { PostGuessedEvent } from '@/types/events/post-guessed';

const ParamsSchema = z.object({ id: z.coerce.number().int().positive() });
const BodySchema = z.object({
  coordinates: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
});

type Context = { params: Promise<{ id: string }> };

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

    const body = await req.json().catch(() => null);
    const parsedBody = BodySchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }
    const { coordinates } = parsedBody.data;

    // Load post, author, zone and the actual photo coordinates in one query
    const postRow = await query(
      `select p.id, p.user_id, p.type, z.id as zone_id, z.slug as zone_slug,
              u.alias as author_alias, uc.details as content_details
       from posts p
       join zones z on z.id = p.zone_id
       join users u on u.id = p.user_id
       join post_content pc on pc.post_id = p.id
       join user_content uc on uc.id = pc.content_id
       where p.id = $1 and p.status = 'published'
       limit 1`,
      [postId]
    );

    if ((postRow.rowCount ?? 0) === 0) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    const post = postRow.rows[0];

    if (post.type !== 'gps-photo') {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }

    if (Number(post.user_id) === auth.user.userId) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    const alreadyGuessed = await query(
      `select id from post_guesses where post_id = $1 and user_id = $2 limit 1`,
      [postId, auth.user.userId]
    );
    if ((alreadyGuessed.rowCount ?? 0) > 0) {
      return NextResponse.json({ error: 'ALREADY_GUESSED' }, { status: 409 });
    }

    const photoCoordinates: { latitude: number; longitude: number } | undefined =
      post.content_details?.coordinates;
    if (!photoCoordinates?.latitude || !photoCoordinates?.longitude) {
      return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
    }

    const distance = haversineMeters(photoCoordinates, coordinates);
    const score = calculateGuessScore(distance);

    const inserted = await query(
      `insert into post_guesses (post_id, user_id, type, details)
       values ($1, $2, 'gps-guess', $3)
       returning id, created_at`,
      [postId, auth.user.userId, JSON.stringify({ coordinates, distance, score })]
    );
    const guessId = inserted.rows[0].id;

    await query(
      `insert into post_comments (post_id, user_id, body, type, metadata, guess_id)
       values ($1, $2, '', 'gps-guess-comment', $3, $4)`,
      [postId, auth.user.userId, JSON.stringify({ score, distance }), guessId]
    );

    eventBus.publish('post', 'guessed', {
      postId,
      guessType: 'gps-guess',
      authorId: Number(post.user_id),
      authorAlias: post.author_alias,
      userId: auth.user.userId,
      userAlias: auth.user.alias,
      score,
      zoneId: Number(post.zone_id),
      zoneSlug: post.zone_slug,
    } as PostGuessedEvent).catch(() => {});

    return NextResponse.json({
      guess: {
        id: guessId,
        postId,
        userId: auth.user.userId,
        author: auth.user.alias,
        type: 'gps-guess',
        createdAt: inserted.rows[0].created_at,
        distance,
        score,
      },
      photoCoordinates,
    });
  } catch (err) {
    await logerror('POST /api/v1/posts/[id]/guesses error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
