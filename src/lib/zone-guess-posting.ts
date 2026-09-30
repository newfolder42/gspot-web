// Server-only. Deliberately not a "use server" module — `clearHiddenDateTaken` takes an
// explicit userId and must never be reachable from a client as a server action.
import { query } from '@/lib/db';
import { logerror } from '@/lib/logger';

/** How the "გადაღებულია" field behaves on the submit form of a zone. */
export type ZoneDateTakenMode = 'mandatory' | 'optional' | 'hidden';

export type ZoneGuessPostingRules = {
  date_taken: ZoneDateTakenMode;
};

const DATE_TAKEN_MODES: ZoneDateTakenMode[] = ['mandatory', 'optional', 'hidden'];

export const DEFAULT_ZONE_GUESS_POSTING_RULES: ZoneGuessPostingRules = {
  date_taken: 'mandatory',
};

/**
 * What a zone's `guess_scoring_rules` starts as when its settings row is first written.
 * `in_guess_index: false` leaves the zone's guesses out of the guess index; a missing key
 * counts as true (see getUserGuesses in lib/posts.ts).
 */
export const DEFAULT_ZONE_GUESS_SCORING_RULES = { in_guess_index: true };

/** `zone_settings.guess_posting_rules`, with anything missing or unknown read as the default. */
export function getZoneGuessPostingRules(raw: unknown): ZoneGuessPostingRules {
  let parsed = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return DEFAULT_ZONE_GUESS_POSTING_RULES;
    }
  }

  if (!parsed || typeof parsed !== 'object') return DEFAULT_ZONE_GUESS_POSTING_RULES;

  const dateTaken = (parsed as { date_taken?: unknown }).date_taken;
  return {
    date_taken: DATE_TAKEN_MODES.includes(dateTaken as ZoneDateTakenMode)
      ? (dateTaken as ZoneDateTakenMode)
      : DEFAULT_ZONE_GUESS_POSTING_RULES.date_taken,
  };
}

/**
 * Drops `dateTaken` from a freshly stored photo when the zone it is being posted to hides
 * the field. The forms already leave it out for such zones; this covers app versions that
 * predate the setting and still always send one.
 */
export async function clearHiddenDateTaken({
  userId,
  contentId,
  zoneId,
}: {
  userId: number;
  contentId: number;
  zoneId: number;
}): Promise<void> {
  try {
    await query(
      `UPDATE user_content
       SET details = details - 'dateTaken'
       WHERE id = $1 AND user_id = $2 AND details ? 'dateTaken'
         AND EXISTS (
           SELECT 1 FROM zone_settings
           WHERE zone_id = $3 AND guess_posting_rules->>'date_taken' = 'hidden'
         )`,
      [contentId, userId, zoneId]
    );
  } catch (err) {
    await logerror('clearHiddenDateTaken error', [err]);
  }
}
