import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // Google auth flow not wired into NextAuth yet.
  return NextResponse.redirect(new URL('/auth/signin?error=google_not_enabled', req.url));
}
