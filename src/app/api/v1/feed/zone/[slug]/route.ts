import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { getZonePosts } from '@/lib/posts';
import { getZone, getZoneMember } from '@/lib/zones';
import { query } from '@/lib/db';
import { logerror } from '@/lib/logger';
import type { FeedFilter } from '@/types/post';

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(4),
  cursorDate: z.string().trim().min(1).optional(),
  cursorId: z.coerce.number().int().positive().optional(),
  filter: z.enum(['all', 'guessed', 'not-guessed']).default('all'),
  tagId: z.coerce.number().int().positive().optional(),
});

type Context = { params: Promise<{ slug: string }> };

export async function GET(req: NextRequest, context: Context) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const { slug } = await context.params;

    const zone = await getZone(slug);
    if (!zone) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

    if (zone.visibility === 'private') {
      const member = await getZoneMember(zone.id, auth.user.userId);
      if (!member || member.status !== 'active') {
        return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
      }
    }

    const parsed = QuerySchema.safeParse({
      limit: req.nextUrl.searchParams.get('limit') ?? undefined,
      cursorDate: req.nextUrl.searchParams.get('cursorDate') ?? undefined,
      cursorId: req.nextUrl.searchParams.get('cursorId') ?? undefined,
      filter: req.nextUrl.searchParams.get('filter') ?? undefined,
      tagId: req.nextUrl.searchParams.get('tagId') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }

    const cursor =
      parsed.data.cursorDate && parsed.data.cursorId
        ? { date: parsed.data.cursorDate, id: parsed.data.cursorId }
        : undefined;

    const [posts, tagsRes] = await Promise.all([
      getZonePosts(
        zone.id,
        auth.user.userId,
        parsed.data.limit,
        cursor,
        parsed.data.filter as FeedFilter,
        parsed.data.tagId ?? null
      ),
      query(
        `SELECT id, name, color FROM zone_tags WHERE zone_id = $1 ORDER BY sort_order ASC, id ASC`,
        [zone.id]
      ),
    ]);

    return NextResponse.json({
      zone: {
        id: zone.id,
        slug: zone.slug,
        name: zone.name,
        description: zone.description,
        profilePhotoUrl: zone.profile_photo_url ?? null,
      },
      tags: tagsRes.rows.map((r) => ({ id: Number(r.id), name: r.name, color: r.color })),
      posts,
    });
  } catch (err) {
    await logerror('GET /api/v1/feed/zone/[slug] error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
