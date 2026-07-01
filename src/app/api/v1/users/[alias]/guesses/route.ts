import { NextRequest, NextResponse } from 'next/server';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { getUserIdByAlias } from '@/lib/users';
import { getUserGuesses } from '@/lib/posts';
import { logerror } from '@/lib/logger';

type Context = { params: Promise<{ alias: string }> };

export async function GET(req: NextRequest, context: Context) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const { alias } = await context.params;
    const userId = await getUserIdByAlias(alias);
    if (!userId) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

    const guesses = await getUserGuesses(userId);

    return NextResponse.json({ guesses });
  } catch (err) {
    await logerror('GET /api/v1/users/[alias]/guesses error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
