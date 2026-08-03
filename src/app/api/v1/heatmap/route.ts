import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { getGlobalPostsHeatmap, getPostsHeatmapForUser } from '@/lib/heatmap';
import { heatmapGlobalMaxZoom, heatmapGridMeters, heatmapOwnMaxZoom } from '@/lib/map';
import { logerror } from '@/lib/logger';

const QuerySchema = z.object({
  scope: z.enum(['global', 'me']).default('global'),
});

// GET /api/v1/heatmap?scope=global|me — post heatmap points snapped to a coarse
// grid. `me` is always the caller's own posts; there is no way to request
// another account's heatmap, matching the web page's own-profile-only rule.
export async function GET(req: NextRequest) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const parsed = QuerySchema.safeParse({
      scope: req.nextUrl.searchParams.get('scope') ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }

    const isOwn = parsed.data.scope === 'me';
    const heatmap = isOwn
      ? await getPostsHeatmapForUser(auth.user.userId)
      : await getGlobalPostsHeatmap();

    return NextResponse.json({
      ...heatmap,
      gridMeters: heatmapGridMeters,
      maxZoom: isOwn ? heatmapOwnMaxZoom : heatmapGlobalMaxZoom,
    });
  } catch (err) {
    await logerror('GET /api/v1/heatmap error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
