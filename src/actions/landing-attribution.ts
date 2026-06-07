"use server";

import { query } from '@/lib/db';
import { logerror } from '@/lib/logger';
import { getCurrentUser } from '@/lib/session';
import {
  normalizeReferrer,
  storeLandingRedirectInputSchema,
} from '@/lib/landing-attribution';

export async function storeLandingRedirect(input: {
  source: 'facebook' | 'meta' | 'reddit';
  landingPath: string;
  referrer?: string;
  utmSource?: string | null;
  utmCampaign?: string | null;
}): Promise<void> {
  const currentUser = await getCurrentUser();
  if (currentUser) {
    return;
  }

  const parsed = storeLandingRedirectInputSchema.safeParse(input);
  if (!parsed.success) {
    return;
  }

  const normalizedSource = parsed.data.source === 'facebook' ? 'meta' : parsed.data.source;

  try {
    await query(
      `INSERT INTO landing_redirects (source, landing_path, referrer, utm_source, utm_campaign)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        normalizedSource,
        parsed.data.landingPath,
        normalizeReferrer(parsed.data.referrer),
        parsed.data.utmSource ?? null,
        parsed.data.utmCampaign ?? null,
      ],
    );
  } catch (error) {
    await logerror('storeLandingRedirect failed', {
      error: error instanceof Error ? error.message : 'unknown error',
      source: normalizedSource,
      landingPath: parsed.data.landingPath,
    });
  }
}