import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { storeMobileProfilePhoto } from '@/lib/mobile-submit';
import { UPLOAD_SIZE_LIMIT } from '@/lib/upload-config';
import { logerror } from '@/lib/logger';

const BodySchema = z.object({
  publicUrl: z.string().url().max(2048),
  fileSize: z.number().int().min(1).max(UPLOAD_SIZE_LIMIT.PROFILE_PHOTO),
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

    const result = await storeMobileProfilePhoto({
      userId: auth.user.userId,
      userAlias: auth.user.alias,
      publicUrl: parsed.data.publicUrl,
      details: { fileSize: parsed.data.fileSize },
    });

    if (!result) {
      return NextResponse.json({ error: 'STORE_FAILED' }, { status: 500 });
    }

    return NextResponse.json({ url: result.url });
  } catch (err) {
    await logerror('POST /api/v1/account/profile-photo error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
