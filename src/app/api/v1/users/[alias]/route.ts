import { NextRequest, NextResponse } from 'next/server';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { getAccountByAlias } from '@/lib/account';
import { getAccountPosts } from '@/lib/posts';
import { logerror } from '@/lib/logger';

type Context = { params: Promise<{ alias: string }> };

export async function GET(req: NextRequest, context: Context) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const { alias } = await context.params;

    const account = await getAccountByAlias(alias, auth.user.userId);
    if (!account) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

    const posts = await getAccountPosts(account.user.id, auth.user.userId, 20);

    return NextResponse.json({
      user: {
        id: account.user.id,
        alias: account.user.alias,
        age: account.user.age,
      },
      profilePhoto: account.profilePhoto,
      level: account.level,
      isOwnProfile: account.isOwnProfile,
      isFollowing: !!account.connection,
      posts,
    });
  } catch (err) {
    await logerror('GET /api/v1/users/[alias] error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
