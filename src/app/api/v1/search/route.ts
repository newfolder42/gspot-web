import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { query } from '@/lib/db';
import { logerror } from '@/lib/logger';

const QuerySchema = z.object({
  q: z.string().trim().min(1).max(100),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const parsed = QuerySchema.safeParse({ q: req.nextUrl.searchParams.get('q') });
    if (!parsed.success) return NextResponse.json({ users: [], posts: [], zones: [] });

    const q = `%${parsed.data.q.toLowerCase()}%`;
    const userId = auth.user.userId;

    const [usersRes, postsRes, zonesRes] = await Promise.all([
      query(
        `SELECT id, alias, CURRENT_DATE::date - created_at::date as age
         FROM users WHERE lower(alias) LIKE $1
         ORDER BY created_at DESC LIMIT 10`,
        [q]
      ),
      query(
        `SELECT p.id, p.title, u.alias as author
         FROM posts p
         JOIN users u ON u.id = p.user_id
         JOIN zones z ON z.id = p.zone_id
         WHERE lower(p.title) LIKE $1 AND p.status = 'published'
           AND (z.visibility = 'public' OR EXISTS (
             SELECT 1 FROM zone_members zm WHERE zm.zone_id = z.id AND zm.user_id = $2 AND zm.status = 'active'
           ))
         ORDER BY p.created_at DESC LIMIT 10`,
        [q, userId]
      ),
      query(
        `SELECT z.id, z.slug, z.description,
                zcp.public_url as profile_photo_url
         FROM zones z
         LEFT JOIN content_store zcp ON zcp.reference_type = 'zone' AND zcp.reference_id = z.id AND zcp.content_type = 'profile-photo'
         WHERE lower(z.slug) LIKE $1 AND z.state = 'active'
           AND (z.visibility = 'public' OR EXISTS (
             SELECT 1 FROM zone_members zm WHERE zm.zone_id = z.id AND zm.user_id = $2 AND zm.status = 'active'
           ))
         ORDER BY z.created_at DESC LIMIT 10`,
        [q, userId]
      ),
    ]);

    return NextResponse.json({
      users: usersRes.rows.map((r) => ({ id: Number(r.id), alias: r.alias, age: Number(r.age) })),
      posts: postsRes.rows.map((r) => ({ id: Number(r.id), title: r.title, author: r.author })),
      zones: zonesRes.rows.map((r) => ({
        id: Number(r.id),
        slug: r.slug,
        description: r.description ?? null,
        profilePhotoUrl: r.profile_photo_url ?? null,
      })),
    });
  } catch (err) {
    await logerror('GET /api/v1/search error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
