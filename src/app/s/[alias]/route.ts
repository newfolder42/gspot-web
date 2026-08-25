import { NextRequest, NextResponse } from 'next/server';
import { buildRedirectUrl, resolveShareLink } from '@/lib/shareLinks';
import { logerror } from '@/lib/logger';

type Context = {
  params: Promise<{ alias: string }>;
};

/**
 * GET /s/:alias — the only URL printed on QR stickers.
 *
 * Where it lands lives in share_links, so the destination can change without
 * reprinting anything. Always a temporary redirect with no caching: a 301 (or a
 * cached 307) would be memorised by the browser and defeat the indirection.
 */
export async function GET(req: NextRequest, context: Context) {
  const { origin, searchParams } = req.nextUrl;
  let destination = `${origin}/`;

  try {
    const { alias } = await context.params;
    const link = await resolveShareLink(alias);

    if (link) {
      destination = buildRedirectUrl(link.targetUrl, origin, searchParams);
    }
  } catch (err) {
    await logerror('GET /s/[alias] error', { error: String(err) });
  }

  return NextResponse.redirect(destination, {
    status: 307,
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}
