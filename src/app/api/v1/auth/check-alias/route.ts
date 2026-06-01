import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { userAliasTaken } from '@/lib/auth';
import { logerror } from '@/lib/logger';

const schema = z.object({
  alias: z.string().min(3).max(30).regex(/^[a-z0-9_-]+$/i),
});

export async function GET(req: NextRequest) {
  try {
    const alias = req.nextUrl.searchParams.get('alias') ?? '';
    const parsed = schema.safeParse({ alias });
    if (!parsed.success) {
      return NextResponse.json({ available: false });
    }
    const taken = await userAliasTaken(parsed.data.alias);
    return NextResponse.json({ available: !taken });
  } catch (err) {
    await logerror('GET /api/v1/auth/check-alias error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
