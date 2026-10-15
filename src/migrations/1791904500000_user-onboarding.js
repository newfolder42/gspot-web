/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * First-run welcome flow (web `/welcome`, mobile onboarding screen).
 *
 * `onboarding_completed_at` is NULL until the user presses the final button of the flow;
 * a NULL after login is what sends them into it.
 *
 * Everyone who exists when this runs is stamped as done: the flow is for people who join
 * from now on, and showing it to an established account would be noise. They are stamped
 * with the migration time rather than their sign-up date, so "skipped by this migration"
 * stays distinguishable from "actually finished it" (same timestamp on all of them).
 *
 * Accounts created after the migration but before the new code is deployed get NULL, which
 * is right — they are new users and will see the flow on their next login.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.addColumn('users', {
    onboarding_completed_at: { type: 'timestamptz' },
  });

  pgm.sql(`UPDATE users SET onboarding_completed_at = now() WHERE onboarding_completed_at IS NULL;`);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropColumn('users', 'onboarding_completed_at');
};
