import { NextRequest, NextResponse } from 'next/server';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { getUserIdByAlias } from '@/lib/users';
import { connectionExists, createConnection, deleteConnection } from '@/lib/connections';
import { logerror } from '@/lib/logger';

type Context = { params: Promise<{ alias: string }> };

async function resolveTarget(req: NextRequest, context: Context) {
  const auth = await requireMobileUser(req);
  if (auth.response) return { error: auth.response } as const;

  const { alias } = await context.params;
  const targetUserId = await getUserIdByAlias(alias);
  if (!targetUserId) {
    return { error: NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 }) } as const;
  }
  if (targetUserId === auth.user.userId) {
    return { error: NextResponse.json({ error: 'CANNOT_FOLLOW_SELF' }, { status: 400 }) } as const;
  }
  return { currentUserId: auth.user.userId, targetUserId } as const;
}

export async function POST(req: NextRequest, context: Context) {
  try {
    const resolved = await resolveTarget(req, context);
    if ('error' in resolved) return resolved.error;
    const { currentUserId, targetUserId } = resolved;

    const exists = await connectionExists(currentUserId, targetUserId, 'connection');
    if (!exists) {
      const created = await createConnection(currentUserId, targetUserId, 'connection');
      if (!created) {
        return NextResponse.json({ error: 'FOLLOW_FAILED' }, { status: 500 });
      }
    }

    return NextResponse.json({ isFollowing: true });
  } catch (err) {
    await logerror('POST /api/v1/users/[alias]/follow error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: Context) {
  try {
    const resolved = await resolveTarget(req, context);
    if ('error' in resolved) return resolved.error;
    const { currentUserId, targetUserId } = resolved;

    await deleteConnection(currentUserId, targetUserId, 'connection');

    return NextResponse.json({ isFollowing: false });
  } catch (err) {
    await logerror('DELETE /api/v1/users/[alias]/follow error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
