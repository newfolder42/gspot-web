import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { storeMobileGpsPhotoContent } from '@/lib/mobile-submit';
import { logerror } from '@/lib/logger';

const BodySchema = z.object({
  publicUrl: z.string().url().max(2048),
  originalFileName: z.string().trim().min(1).max(255),
  fileSize: z.number().int().min(1).max(30 * 1024 * 1024),
  coordinates: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
  dateTaken: z.string().datetime().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }

    const content = await storeMobileGpsPhotoContent({
      userId: auth.user.userId,
      publicUrl: parsed.data.publicUrl,
      details: {
        originalFileName: parsed.data.originalFileName,
        fileSize: parsed.data.fileSize,
        coordinates: parsed.data.coordinates,
        dateTaken: parsed.data.dateTaken,
      },
    });

    if (!content) {
      return NextResponse.json({ error: 'STORE_FAILED' }, { status: 500 });
    }

    return NextResponse.json({ contentId: content.id });
  } catch (err) {
    await logerror('POST /api/v1/submit/content error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
