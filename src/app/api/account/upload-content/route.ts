import { NextResponse } from 'next/server';
import { getUserTokenAndValidate, verifyToken } from '@/lib/session';
import { getSignedUploadUrl } from '@/lib/s3';
import { storeContent } from '@/lib/content';
import { v4 } from 'uuid'

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, filename, contentType, fileSize, coordinates } = body;
    const lat = coordinates?.lat ?? null;
    const lon = coordinates?.lon ?? null;

    if (!type || !filename) {
      return NextResponse.json({ error: 'Bad request, fill required fields' }, { status: 400 });
    }

    let currentUserId: number;
    try {
      const payload = await getUserTokenAndValidate();
      currentUserId = payload?.userId;
    } catch (e) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const uploadUrl = await getSignedUploadUrl({
      key: `${type}/${v4()}`,
      contentType: contentType || 'image/jpeg',
    });

    const publicUrl = uploadUrl.split('?')[0];

    const meta: any = { originalFileName: filename, fileSize };
    if (coordinates && (lat !== null || lon !== null)) meta.coordinates = { lat, lon };

    const res = await storeContent(
      currentUserId, type, publicUrl, JSON.stringify(meta)
    );

    return NextResponse.json({ uploadUrl, contentId: res });
  } catch (err) {
    console.error('upload-photo error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
