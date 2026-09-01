import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { createHideAndSeekGameForUser, listHideAndSeekGamesForUser } from '@/lib/hideAndSeek';
import {
  MAX_CHECKS,
  MAX_DURATION_MINUTES,
  MIN_CHECKS,
  MIN_DURATION_MINUTES,
} from '@/types/hide-and-seek';
import { logerror } from '@/lib/logger';
import type { HideAndSeekListFilter } from '@/types/hide-and-seek';

const BodySchema = z.object({
  title: z.string().min(1).max(200),
  coordinates: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  durationMinutes: z.number().int().min(MIN_DURATION_MINUTES).max(MAX_DURATION_MINUTES),
  maxChecks: z.number().int().min(MIN_CHECKS).max(MAX_CHECKS),
  zoneId: z.number().int().positive(),
  zoneSlug: z.string(),
  visibility: z.enum(['public', 'private']),
  endOnFirstFind: z.boolean().optional(),
  inviteeIds: z.array(z.number().int().positive()).optional(),
  // aliases are resolved server-side; unknown ones are dropped
  inviteeAliases: z.array(z.string().trim().min(1)).max(50).optional(),
});

const QuerySchema = z.object({
  filter: z.enum(['all', 'active', 'ended']).default('all'),
  limit: z.coerce.number().int().min(1).max(50).default(30),
  offset: z.coerce.number().int().min(0).default(0),
});

// GET /api/v1/hide-and-seek — every game the caller may see, current and past
export async function GET(req: NextRequest) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const parsed = QuerySchema.safeParse({
      filter: req.nextUrl.searchParams.get('filter') ?? undefined,
      limit: req.nextUrl.searchParams.get('limit') ?? undefined,
      offset: req.nextUrl.searchParams.get('offset') ?? undefined,
    });
    if (!parsed.success) return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });

    const games = await listHideAndSeekGamesForUser(
      auth.user.userId,
      parsed.data.filter as HideAndSeekListFilter,
      parsed.data.limit,
      parsed.data.offset
    );

    return NextResponse.json({ games });
  } catch (err) {
    await logerror('GET /api/v1/hide-and-seek error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}

// POST /api/v1/hide-and-seek — start a game (one active game per user, either role)
export async function POST(req: NextRequest) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });

    const result = await createHideAndSeekGameForUser(auth.user.userId, auth.user.alias, parsed.data);
    if (!result.ok) {
      return NextResponse.json({ error: result.reason.toUpperCase() }, { status: 400 });
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (err) {
    await logerror('POST /api/v1/hide-and-seek error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
