import { NextRequest, NextResponse } from 'next/server';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { query } from '@/lib/db';
import { logerror } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const res = await query(
      `SELECT z.id, z.slug, z.name, z.description,
              z.visibility, z.join_policy, z.state,
              zcp.public_url as profile_photo_url,
              (zm.id IS NOT NULL) as is_member
       FROM zones z
       LEFT JOIN content_store zcp ON zcp.reference_type = 'zone' AND zcp.reference_id = z.id AND zcp.content_type = 'profile-photo'
       LEFT JOIN zone_members zm ON zm.zone_id = z.id AND zm.user_id = $1 AND zm.status = 'active'
       WHERE z.visibility = 'public' AND z.state = 'active'
       ORDER BY is_member DESC, z.slug ASC`,
      [auth.user.userId]
    );

    const zones = res.rows.map((r) => ({
      id: Number(r.id),
      slug: r.slug,
      name: r.name,
      description: r.description ?? null,
      profilePhotoUrl: r.profile_photo_url ?? null,
      visibility: r.visibility,
      joinPolicy: r.join_policy,
      isMember: Boolean(r.is_member),
    }));

    return NextResponse.json({ zones });
  } catch (err) {
    await logerror('GET /api/v1/zones error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
