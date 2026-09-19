import { NextRequest, NextResponse } from 'next/server';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { getAccountByAlias } from '@/lib/account';
import { getAccountPosts, getAccountPostsCount } from '@/lib/posts';
import { getUserStreakInfo } from '@/lib/streaks';
import { getLevelFromXp } from '@/lib/xp';
import { logerror } from '@/lib/logger';

type Context = { params: Promise<{ alias: string }> };

export async function GET(req: NextRequest, context: Context) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const { alias } = await context.params;

    // Clients that page the grid through /users/[alias]/posts opt out of the
    // inline first page; older builds omit the flag and still get it.
    const includePosts = req.nextUrl.searchParams.get('includePosts') !== '0';

    const account = await getAccountByAlias(alias, auth.user.userId);
    if (!account) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

    const [posts, postsCount, streak, xpInfo] = await Promise.all([
      includePosts ? getAccountPosts(account.user.id, auth.user.userId, 20) : Promise.resolve([]),
      getAccountPostsCount(account.user.id),
      getUserStreakInfo(account.user.id),
      getLevelFromXp(account.level?.xp ?? 0),
    ]);

    return NextResponse.json({
      user: {
        id: account.user.id,
        alias: account.user.alias,
        age: account.user.age,
      },
      profilePhoto: account.profilePhoto,
      level: account.level,
      xpInfo,
      isOwnProfile: account.isOwnProfile,
      isFollowing: !!account.connection,
      streak,
      posts,
      postsCount,
    });
  } catch (err) {
    await logerror('GET /api/v1/users/[alias] error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
