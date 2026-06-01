import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { generateFileUrl } from '@/lib/s3';
import { logerror } from '@/lib/logger';

const BodySchema = z.object({
  type: z.literal('gps-photo').default('gps-photo'),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const body = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }

    const signedUrl = await generateFileUrl(parsed.data.type);
    return NextResponse.json({ signedUrl });
  } catch (err) {
    await logerror('POST /api/v1/submit/upload-url error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
