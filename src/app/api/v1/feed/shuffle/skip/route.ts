import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { recordGuessSkips } from '@/lib/guessSkips';
import { logerror } from '@/lib/logger';

const BodySchema = z.object({
  postIds: z.array(z.coerce.number().int().positive()).min(1).max(50),
});

// POST /api/v1/feed/shuffle/skip — hold these posts back from the deck for a while.
export async function POST(req: NextRequest) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }

    await recordGuessSkips(auth.user.userId, parsed.data.postIds);
    return NextResponse.json({ ok: true });
  } catch (err) {
    await logerror('POST /api/v1/feed/shuffle/skip error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
