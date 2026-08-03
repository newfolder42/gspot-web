import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { getRewardUsers, giveRewardForUser } from '@/lib/rewards';
import { canUserAccessPost } from '@/lib/post-access';
import { logerror } from '@/lib/logger';

const ParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const BodySchema = z.object({
  commentId: z.number().int().positive().nullable().default(null),
  rewardKey: z.string().trim().min(1).max(100),
});

type Context = {
  params: Promise<{ id: string }>;
};

// GET /api/v1/posts/:id/rewards?commentId=123 — who gave which reward on the
// post (commentId omitted) or one of its comments.
export async function GET(req: NextRequest, context: Context) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const params = await context.params;
    const parsed = ParamsSchema.safeParse({ id: params.id });
    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }

    const rawCommentId = req.nextUrl.searchParams.get('commentId');
    const commentId = rawCommentId ? Number(rawCommentId) : null;
    if (commentId !== null && !Number.isInteger(commentId)) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }

    if (!(await canUserAccessPost(auth.user.userId, parsed.data.id))) {
      return NextResponse.json({ users: [] });
    }

    const users = await getRewardUsers(parsed.data.id, commentId);
    return NextResponse.json({ users });
  } catch (err) {
    await logerror('GET /api/v1/posts/[id]/rewards error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}

// POST /api/v1/posts/:id/rewards — give a reward. One-shot: once given on a
// target it can never be removed or switched. Returns the fresh summary.
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

    const summary = await giveRewardForUser(
      auth.user.userId,
      auth.user.alias,
      parsedParams.data.id,
      parsedBody.data.commentId,
      parsedBody.data.rewardKey
    );

    // null covers every rejection path: unknown/disabled reward, wrong target,
    // not unlocked, no access, already rewarded here, or daily quota spent.
    if (!summary) {
      return NextResponse.json({ error: 'REWARD_FAILED' }, { status: 403 });
    }

    return NextResponse.json(summary);
  } catch (err) {
    await logerror('POST /api/v1/posts/[id]/rewards error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
