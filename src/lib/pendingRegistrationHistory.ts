import { query } from "@/lib/db";
import { logerror } from "./logger";

export type PendingRegistrationOutcome = 'completed' | 'expired' | 'replaced' | 'failed' | 'missing';

export type PendingRegistrationSnapshot = {
  id: number | null;
  email: string;
  alias: string | null;
  name: string | null;
  created_at: Date | null;
};

/**
 * Best-effort: a history write must never break signup, so failures are only logged.
 * Never pass the password hash in here.
 */
export async function recordPendingRegistrationHistory(
  rows: PendingRegistrationSnapshot[],
  outcome: PendingRegistrationOutcome,
  detail?: string
): Promise<void> {
  if (rows.length === 0) return;
  try {
    for (const row of rows) {
      await query(
        `INSERT INTO pending_registration_history
           (pending_id, email, alias, name, pending_created_at, outcome, detail)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [row.id, row.email, row.alias, row.name, row.created_at, outcome, detail ?? null]
      );
    }
  } catch (err) {
    await logerror('recordPendingRegistrationHistory error', [err, outcome, rows.map(r => r.email)]);
  }
}
