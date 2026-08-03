import { NextRequest, NextResponse } from 'next/server';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { query } from '@/lib/db';

export async function POST(req: NextRequest) {
  const auth = await requireMobileUser(req);
  if (auth.response) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }

  const token = (body as any)?.token;
  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'MISSING_TOKEN' }, { status: 400 });
  }

  // Upsert: insert the token if new, update updated_at if already exists
  await query(
    `INSERT INTO mobile_push_tokens (user_id, token, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (token) DO UPDATE SET user_id = $1, updated_at = NOW()`,
    [auth.user.userId, token]
  );

  return NextResponse.json({ ok: true });
}

/** Unregisters a device, called by the app on logout. */
export async function DELETE(req: NextRequest) {
  const auth = await requireMobileUser(req);
  if (auth.response) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }

  const token = (body as any)?.token;
  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'MISSING_TOKEN' }, { status: 400 });
  }

  // Scoped to the caller so one user cannot unregister another user's device
  await query(
    `DELETE FROM mobile_push_tokens WHERE token = $1 AND user_id = $2`,
    [token, auth.user.userId]
  );

  return NextResponse.json({ ok: true });
}
