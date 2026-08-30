import { NextRequest, NextResponse } from 'next/server';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { generateFileUrl } from '@/lib/s3';
import { logerror } from '@/lib/logger';

// POST /api/v1/hide-and-seek/upload-url — presigned PUT for a check photo.
export async function POST(req: NextRequest) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const signedUrl = await generateFileUrl('hide-and-seek-check');
    return NextResponse.json({ signedUrl });
  } catch (err) {
    await logerror('POST /api/v1/hide-and-seek/upload-url error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
