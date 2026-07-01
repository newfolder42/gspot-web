import { NextRequest, NextResponse } from 'next/server';
import { resolveZoneContext } from '@/app/api/v1/_utils/zone';
import { getLeaderboard } from '@/lib/leaderboard';
import { recentPeriodKeys, periodLabel } from '@/lib/period';
import { logerror } from '@/lib/logger';

type Context = { params: Promise<{ slug: string }> };

export async function GET(req: NextRequest, context: Context) {
  try {
    const { slug } = await context.params;
    const { ctx, response } = await resolveZoneContext(req, slug);
    if (response) return response;

    const weekKeys = recentPeriodKeys('weekly', 10);
    const monthKeys = recentPeriodKeys('monthly', 12);
    const validKeys = ['total', ...weekKeys, ...monthKeys];

    const requested = req.nextUrl.searchParams.get('period');
    const periodKey = requested && validKeys.includes(requested) ? requested : 'total';

    const entries = await getLeaderboard('gps-guessers', slug, periodKey, 50, 0);

    return NextResponse.json({
      periodKey,
      periods: validKeys.map((key) => ({ key, label: periodLabel(key) })),
      entries,
    });
  } catch (err) {
    await logerror('GET /api/v1/zones/[slug]/leaderboard error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
