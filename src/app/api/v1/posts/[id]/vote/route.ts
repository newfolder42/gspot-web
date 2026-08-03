import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { toggleVoteForUser } from '@/lib/votes';
import { logerror } from '@/lib/logger';

const ParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const BodySchema = z.object({
  commentId: z.number().int().positive().nullable().default(null),
  value: z.union([z.literal(1), z.literal(-1)]),
});

type Context = {
  params: Promise<{ id: string }>;
};

// POST /api/v1/posts/:id/vote — add, switch or remove the caller's vote on the
// post (commentId null) or one of its comments. Returns the fresh summary.
export async function POST(req: NextRequest, context: Context) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const params = await context.params;
    const parsedParams = ParamsSchema.safeParse({ id: params.id });
    if (!parsedParams.success) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }

    const parsedBody = BodySchema.safeParse(await req.json());
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }

    const summary = await toggleVoteForUser(
      auth.user.userId,
      auth.user.alias,
      parsedParams.data.id,
      parsedBody.data.commentId,
      parsedBody.data.value
    );

    if (!summary) {
      return NextResponse.json({ error: 'VOTE_FAILED' }, { status: 403 });
    }

    return NextResponse.json(summary);
  } catch (err) {
    await logerror('POST /api/v1/posts/[id]/vote error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
