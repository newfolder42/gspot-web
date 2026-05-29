import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { signup } from '@/lib/auth';
import { logerror } from '@/lib/logger';

const RegisterSchema = z.object({
  name: z.string().min(1).max(100),
  alias: z.string().min(3).max(30).regex(/^[a-z0-9_-]+$/),
  email: z.string().email().max(255),
  password: z.string().min(6).max(128),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }

    await signup(parsed.data);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err?.message === 'USER_EXISTS') {
      return NextResponse.json({ error: 'USER_EXISTS' }, { status: 409 });
    }
    if (err?.message === 'ALIAS_EXISTS') {
      return NextResponse.json({ error: 'ALIAS_EXISTS' }, { status: 409 });
    }
    if (err?.message === 'INVALID_INPUT') {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }
    await logerror('POST /api/v1/auth/register error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
