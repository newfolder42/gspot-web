"use server";

import { query } from '@/lib/db';
import { logerror } from '@/lib/logger';
import { getCurrentUser } from '@/lib/session';
import { normalizeReferrer } from '@/lib/landing-attribution';

export async function storeLandingRedirect(input: {
  source: string;
  landingPath: string;
  referrer?: string;
  utmCampaign?: string | null;
}): Promise<void> {
  const currentUser = await getCurrentUser();
  if (currentUser) {
    return;
  }

  try {
    await query(
      `INSERT INTO landing_redirects (source, landing_path, referrer, utm_campaign)
       VALUES ($1, $2, $3, $4)`,
      [
        input.source,
        input.landingPath,
        normalizeReferrer(input.referrer),
        input.utmCampaign ?? null,
      ],
    );
  } catch (error) {
    await logerror('storeLandingRedirect failed', {
      error: error instanceof Error ? error.message : 'unknown error',
      source: input.source,
      landingPath: input.landingPath,
    });
  }
}