import { NextRequest, NextResponse } from 'next/server';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { getUserPostZones } from '@/lib/zones';
import { getZoneTags } from '@/lib/tags';
import { getZoneUploadRules } from '@/actions/zones';
import { logerror } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const zones = await getUserPostZones(auth.user.userId);
    const result = await Promise.all(
      zones.map(async (zone) => ({
        id: zone.id,
        slug: zone.slug,
        name: zone.name,
        description: zone.description,
        settings: {
          upload_rules: getZoneUploadRules(zone.upload_rules),
        },
        tags: await getZoneTags(zone.id),
      }))
    );

    return NextResponse.json({ zones: result });
  } catch (err) {
    await logerror('GET /api/v1/submit/zones error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
