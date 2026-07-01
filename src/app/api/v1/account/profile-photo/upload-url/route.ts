import { NextRequest, NextResponse } from 'next/server';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { generateFileUrl } from '@/lib/s3';
import { logerror } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const signedUrl = await generateFileUrl('profile-photo');
    return NextResponse.json({ signedUrl });
  } catch (err) {
    await logerror('POST /api/v1/account/profile-photo/upload-url error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
