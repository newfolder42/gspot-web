import { NextRequest, NextResponse } from 'next/server';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { getUserIdByAlias } from '@/lib/users';
import { getAccountAchievementsByAlias } from '@/lib/userAchievements';
import { getRewardDefinitionsByKeys } from '@/lib/rewards';
import { getCatalogRewardKeys } from '@/types/reward';
import { logerror } from '@/lib/logger';

type Context = { params: Promise<{ alias: string }> };

export async function GET(req: NextRequest, context: Context) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const { alias } = await context.params;
    const userId = await getUserIdByAlias(alias);
    if (!userId) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

    const achievements = (await getAccountAchievementsByAlias(userId)) ?? [];

    // Catalog reward tiles need name/icon; xp and reward-limit tiles are self-describing.
    const rewardKeys = Array.from(new Set(achievements.flatMap((a) => getCatalogRewardKeys(a.rewards))));
    const rewardDefinitions = await getRewardDefinitionsByKeys(rewardKeys);

    return NextResponse.json({ achievements, rewardDefinitions });
  } catch (err) {
    await logerror('GET /api/v1/users/[alias]/achievements error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
