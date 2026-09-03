import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { submitReportForUser } from '@/lib/reports';
import type { ReportReason, ReportTargetType } from '@/types/report';
import { logerror } from '@/lib/logger';

const REASONS = ['child_safety', 'nudity_sexual_content', 'harassment_threats', 'violence', 'spam', 'other'] as const;
const TARGET_TYPES = ['post', 'comment', 'user'] as const;

const BodySchema = z.object({
  targetType: z.enum(TARGET_TYPES),
  targetId: z.number().int().positive(),
  reason: z.enum(REASONS),
  details: z.string().trim().max(1000).optional(),
});

// POST /api/v1/reports — file an in-app report against a post, comment, or user.
export async function POST(req: NextRequest) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const parsedBody = BodySchema.safeParse(await req.json());
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }

    const { targetType, targetId, reason, details } = parsedBody.data;

    const ok = await submitReportForUser(
      auth.user.userId,
      auth.user.alias,
      targetType as ReportTargetType,
      targetId,
      reason as ReportReason,
      details
    );

    if (!ok) {
      return NextResponse.json({ error: 'REPORT_FAILED' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    await logerror('POST /api/v1/reports error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
