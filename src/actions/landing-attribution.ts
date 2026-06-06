"use server";

import { query } from '@/lib/db';
import { logerror } from '@/lib/logger';
import { getCurrentUser } from '@/lib/session';
import {
  normalizeReferrer,
  storeLandingRedirectInputSchema,
} from '@/lib/landing-attribution';

export async function storeLandingRedirect(input: {
  source: 'facebook' | 'reddit';
  landingPath: string;
  referrer?: string;
}): Promise<void> {
  const currentUser = await getCurrentUser();
  if (currentUser) {
    return;
  }

  const parsed = storeLandingRedirectInputSchema.safeParse(input);
  if (!parsed.success) {
    return;
  }

  try {
    await query(
      `INSERT INTO landing_redirects (source, landing_path, referrer)
       VALUES ($1, $2, $3)`,
      [
        parsed.data.source,
        parsed.data.landingPath,
        normalizeReferrer(parsed.data.referrer),
      ],
    );
  } catch (error) {
    await logerror('storeLandingRedirect failed', {
      error: error instanceof Error ? error.message : 'unknown error',
      source: parsed.data.source,
      landingPath: parsed.data.landingPath,
    });
  }
}